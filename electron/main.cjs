// CommonJS entry point. The project is ESM ("type": "module"), but Electron's
// ESM main-process support trips over the built-in `electron` module, so we use
// require() here and pull in the ESM server via dynamic import().
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { app, BrowserWindow, ipcMain, shell } = require('electron');

// The dashboard is local-first: one window per instance is plenty. A second
// launch just focuses the existing window (see 'second-instance' below).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// In dev, server/config.js loads .env from process.cwd(); anchor it to the
// project root so config resolves the same way it does under `npm start`.
// When packaged, the app lives inside app.asar (a virtual fs you cannot chdir
// into) — so skip it and rely on defaults / real environment variables.
if (!app.isPackaged) {
  process.chdir(path.join(__dirname, '..'));
}

// The app sources are TypeScript, compiled to plain ESM JS in dist-server/ by
// `npm run build:server` (Electron's bundled Node can't type-strip .ts files).
// The npm scripts (`app`, `dist:*`) run that build before launching.
function distPath(...segments) {
  return pathToFileURL(path.join(__dirname, '..', 'dist-server', ...segments)).href;
}

// Loaded from the compiled shared module in app.whenReady() before any IPC runs.
let DEFAULT_THEME_ID = 'terminal-console';
let validateThemePack = () => ['theme schema not loaded'];

async function loadThemeSchema() {
  const schema = await import(distPath('shared', 'theme-schema.js'));
  DEFAULT_THEME_ID = schema.DEFAULT_THEME_ID;
  validateThemePack = schema.validateThemePack;
}

let win = null;

function themesDir() {
  return path.join(__dirname, '..', 'themes');
}

function themeStoreDir() {
  return path.join(app.getPath('userData'), 'themes');
}

function themeSettingsFile() {
  return path.join(app.getPath('userData'), 'theme-settings.json');
}

async function readJson(file) {
  return JSON.parse(await fsp.readFile(file, 'utf8'));
}

async function listThemeFiles(dir) {
  try {
    const files = await fsp.readdir(dir);
    return files.filter((file) => file.endsWith('.json')).map((file) => path.join(dir, file));
  } catch {
    return [];
  }
}

async function loadBuiltInThemes() {
  const files = await listThemeFiles(themesDir());
  const themes = [];
  for (const file of files) {
    try {
      themes.push({ theme: await readJson(file), source: 'built-in' });
    } catch {
      // Ignore malformed bundled themes so the app can still boot.
    }
  }
  return themes.sort((a, b) => a.theme.name.localeCompare(b.theme.name));
}

async function loadCustomThemes() {
  await fsp.mkdir(themeStoreDir(), { recursive: true });
  const files = await listThemeFiles(themeStoreDir());
  const themes = [];
  for (const file of files) {
    try {
      const theme = await readJson(file);
      if (!validateThemePack(theme).length) themes.push({ theme, source: 'custom' });
    } catch {
      // Bad custom files should not crash startup.
    }
  }
  return themes.sort((a, b) => a.theme.name.localeCompare(b.theme.name));
}

async function readSelectedThemeId() {
  try {
    const settings = await readJson(themeSettingsFile());
    return settings.selectedThemeId || DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

async function writeSelectedThemeId(selectedThemeId) {
  await fsp.mkdir(path.dirname(themeSettingsFile()), { recursive: true });
  await fsp.writeFile(themeSettingsFile(), JSON.stringify({ selectedThemeId }, null, 2));
}

async function listThemesPayload() {
  const [builtIns, customThemes, selectedThemeId] = await Promise.all([
    loadBuiltInThemes(),
    loadCustomThemes(),
    readSelectedThemeId(),
  ]);
  const themes = [...builtIns, ...customThemes];
  const selectedExists = themes.some((item) => item.theme.id === selectedThemeId);
  return { themes, selectedThemeId: selectedExists ? selectedThemeId : DEFAULT_THEME_ID };
}

function customThemePath(themeId) {
  return path.join(themeStoreDir(), `${themeId}.json`);
}

function registerThemeIpc() {
  ipcMain.handle('themes:list', () => listThemesPayload());
  ipcMain.handle('themes:set-selected', async (_event, themeId) => {
    const payload = await listThemesPayload();
    if (!payload.themes.some((item) => item.theme.id === themeId)) return { ok: false, error: 'Theme not found.' };
    await writeSelectedThemeId(themeId);
    return { ok: true };
  });
  ipcMain.handle('themes:import', async (_event, jsonText) => {
    let theme;
    try {
      theme = JSON.parse(jsonText);
    } catch {
      return { ok: false, errors: ['Invalid JSON.'] };
    }
    const errors = validateThemePack(theme);
    if (errors.length) return { ok: false, errors };
    await fsp.mkdir(themeStoreDir(), { recursive: true });
    await fsp.writeFile(customThemePath(theme.id), JSON.stringify(theme, null, 2));
    await writeSelectedThemeId(theme.id);
    return { ok: true, theme };
  });
  ipcMain.handle('themes:delete-custom', async (_event, themeId) => {
    const builtIns = await loadBuiltInThemes();
    if (builtIns.some((item) => item.theme.id === themeId)) return { ok: false, error: 'Built-in themes cannot be deleted.' };
    await fsp.rm(customThemePath(themeId), { force: true });
    if ((await readSelectedThemeId()) === themeId) await writeSelectedThemeId(DEFAULT_THEME_ID);
    return { ok: true };
  });
  ipcMain.handle('themes:reset', async () => {
    await writeSelectedThemeId(DEFAULT_THEME_ID);
    return { ok: true };
  });
  ipcMain.handle('themes:export', async (_event, themeId) => {
    const payload = await listThemesPayload();
    const found = payload.themes.find((item) => item.theme.id === themeId);
    return found ? { ok: true, jsonText: JSON.stringify(found.theme, null, 2) } : { ok: false, error: 'Theme not found.' };
  });
}

async function startServer() {
  // Importing the server module boots the HTTP server + poll loop as a side
  // effect and hands back a promise that resolves with the bound URL. Use an
  // absolute file:// URL so ESM resolution works both in dev and from app.asar.
  const { ready } = await import(distPath('server', 'index.js'));
  try {
    return await ready;
  } catch (err) {
    // A dashboard instance is already serving this port (e.g. `npm start` in a
    // terminal). Don't fight it — just point the window at the running server.
    if (err && err.code === 'EADDRINUSE') {
      const { config } = await import(distPath('server', 'config.js'));
      console.warn(`Port ${config.port} in use — attaching to the existing dashboard.`);
      return { host: config.host, port: config.port, url: `http://${config.host}:${config.port}` };
    }
    throw err;
  }
}

function createWindow(url) {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    title: 'Agentic Dashboard',
    backgroundColor: '#0d1117',
    webPreferences: {
      // Renderer only talks to the local HTTP API — no Node access needed.
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  win.loadURL(url);

  // Open external links (docs, repos) in the system browser, not in-app.
  const appHost = new URL(url).host;
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    try {
      if (new URL(target).host === appHost) return { action: 'allow' };
    } catch { /* fall through to external */ }
    shell.openExternal(target);
    return { action: 'deny' };
  });

  win.on('closed', () => { win = null; });
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(async () => {
  try {
    await loadThemeSchema();
  } catch (err) {
    console.error('Failed to load theme schema from dist-server (run `npm run build:server`):', err);
  }
  registerThemeIpc();
  let url;
  try {
    ({ url } = await startServer());
  } catch (err) {
    console.error('Failed to start dashboard server:', err);
    app.quit();
    return;
  }

  createWindow(url);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
  });
});

// Local-first tool: quitting all windows quits the app on every platform.
app.on('window-all-closed', () => {
  app.quit();
});
