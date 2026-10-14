// Generated from preload.ts by scripts/build-preloads.mjs.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("drAWDesktop", {
    platform: process.platform,
    quickCapture: {
        take: (mode) => electron_1.ipcRenderer.invoke("quick-capture:take", mode),
        cancel: () => { electron_1.ipcRenderer.send("quick-capture:cancel"); }
    },
    storage: {
        save: (document) => electron_1.ipcRenderer.invoke("storage:save", document),
        load: (id) => electron_1.ipcRenderer.invoke("storage:load", id),
        delete: (id) => electron_1.ipcRenderer.invoke("storage:delete", id),
        rename: (id, newName) => electron_1.ipcRenderer.invoke("storage:rename", id, newName),
        list: () => electron_1.ipcRenderer.invoke("storage:list")
    },
    onShutdownRequest: (callback) => {
        electron_1.ipcRenderer.on("app:shutdown-request", () => callback());
    },
    shutdownComplete: () => {
        electron_1.ipcRenderer.send("app:shutdown-complete");
    },
    shutdownCancelled: () => {
        electron_1.ipcRenderer.send("app:shutdown-cancelled");
    },
    windowControls: {
        minimize: () => {
            electron_1.ipcRenderer.send("window:minimize");
        },
        toggleMaximize: () => {
            electron_1.ipcRenderer.send("window:toggle-maximize");
        },
        toggleFullscreen: () => {
            electron_1.ipcRenderer.send("window:toggle-fullscreen");
        },
        setFullscreen: (enabled) => {
            electron_1.ipcRenderer.send("window:set-fullscreen", enabled);
        },
        isFullscreen: () => {
            return electron_1.ipcRenderer.invoke("window:is-fullscreen");
        },
        close: () => {
            electron_1.ipcRenderer.send("window:close");
        },
        onMaximizeChanged: (callback) => {
            electron_1.ipcRenderer.on("window:maximize-changed", (_event, maximized) => callback(maximized));
        },
        onFullscreenChanged: (callback) => {
            electron_1.ipcRenderer.on("window:fullscreen-changed", (_event, fullscreen) => callback(fullscreen));
        }
    },
    photoFolder: {
        selectPhoto: (defaultPath) => electron_1.ipcRenderer.invoke("photo:select", defaultPath),
        listPhotos: (folderPath) => electron_1.ipcRenderer.invoke("photo:list", folderPath),
        readPhoto: (folderPath, fileName) => {
            return electron_1.ipcRenderer.invoke("photo:read", folderPath, fileName);
        }
    }
});
