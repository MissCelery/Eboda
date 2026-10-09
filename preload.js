const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("eboda", {
  platform: "desktop",
  getLaunchFiles: () => ipcRenderer.invoke("launch-files"),
  onOpenFile: cb => ipcRenderer.on("open-file", (_e, f) => cb(f)),
  saveFile: (filename, bytes) => ipcRenderer.invoke("save-file", { filename, bytes }),
  print: payload => ipcRenderer.invoke("print", payload)
});
