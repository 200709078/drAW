const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("drAWDesktop", {
    requestScreenCapture: () => ipcRenderer.invoke("screen-capture:start"),
    cancelScreenCapture: () => ipcRenderer.send("screen-capture:cancel")
});
