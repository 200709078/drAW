const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("drAWDesktop", {
    requestScreenCapture: () => ipcRenderer.invoke("screen-capture:start"),
    cancelScreenCapture: () => ipcRenderer.send("screen-capture:cancel"),
    storage: {
        save: (document) => ipcRenderer.invoke("storage:save", document),
        load: (id) => ipcRenderer.invoke("storage:load", id),
        delete: (id) => ipcRenderer.invoke("storage:delete", id),
        rename: (id, newName) => ipcRenderer.invoke("storage:rename", id, newName),
        list: () => ipcRenderer.invoke("storage:list")
    },
    onShutdownRequest: (callback) => {
        ipcRenderer.on("app:shutdown-request", () => callback());
    },
    shutdownComplete: () => {
        ipcRenderer.send("app:shutdown-complete");
    }
});
