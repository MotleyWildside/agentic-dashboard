const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agentThemes', {
  list: () => ipcRenderer.invoke('themes:list'),
  setSelected: (themeId) => ipcRenderer.invoke('themes:set-selected', themeId),
  importTheme: (jsonText) => ipcRenderer.invoke('themes:import', jsonText),
  deleteCustom: (themeId) => ipcRenderer.invoke('themes:delete-custom', themeId),
  reset: () => ipcRenderer.invoke('themes:reset'),
  exportTheme: (themeId) => ipcRenderer.invoke('themes:export', themeId),
});
