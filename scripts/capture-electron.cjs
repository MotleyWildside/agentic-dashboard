const fs = require('node:fs/promises');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const url = process.argv[2] || 'http://127.0.0.1:4321/';
const output = process.argv[3] || path.join(process.cwd(), 'agent-control-1024x600.png');
const width = Number(process.argv[4] || 1024);
const height = Number(process.argv[5] || 600);
const action = process.argv[6] || '';

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  await win.loadURL(url);
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (action) {
    await win.webContents.executeJavaScript(action);
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  const image = await win.webContents.capturePage();
  await fs.writeFile(output, image.toPNG());
  const metrics = await win.webContents.executeJavaScript(`(() => {
    const body = document.body.getBoundingClientRect();
    const text = document.body.innerText;
    const offscreen = [...document.querySelectorAll('body *')].filter((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      return rect.right > window.innerWidth + 2 || rect.bottom > window.innerHeight + 80;
    }).slice(0, 10).map((el) => ({
      tag: el.tagName,
      text: el.textContent.trim().slice(0, 70),
      rect: el.getBoundingClientRect().toJSON()
    }));
    return { body: body.toJSON(), hasDashboard: text.includes('Agent Control') && text.includes('Claude Code') && text.includes('Codex'), offscreenCount: offscreen.length, offscreen };
  })()`);
  console.log(JSON.stringify({ output, metrics }, null, 2));
  app.quit();
});
