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
    },
    windowControls: {
        minimize: () => {
            ipcRenderer.send("window:minimize");
        },
        toggleMaximize: () => {
            ipcRenderer.send("window:toggle-maximize");
        },
        toggleFullscreen: () => {
            ipcRenderer.send("window:toggle-fullscreen");
        },
        setFullscreen: (enabled) => {
            ipcRenderer.send("window:set-fullscreen", enabled);
        },
        isFullscreen: () => {
            return ipcRenderer.invoke("window:is-fullscreen");
        },
        close: () => {
            ipcRenderer.send("window:close");
        },
        onMaximizeChanged: (callback) => {
            ipcRenderer.on("window:maximize-changed", (_event, maximized) => callback(maximized));
        },
        onFullscreenChanged: (callback) => {
            ipcRenderer.on("window:fullscreen-changed", (_event, fullscreen) => callback(fullscreen));
        }
    },
    photoFolder: {
        selectPhoto: () => ipcRenderer.invoke("photo:select"),
        listPhotos: (folderPath) => ipcRenderer.invoke("photo:list", folderPath),
        readPhoto: (folderPath, fileName) => ipcRenderer.invoke("photo:read", folderPath, fileName)
    }
});
