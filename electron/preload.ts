import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("drAWDesktop", {
    platform: process.platform,
    screenKeyboard: {
        show: (requestId: string): Promise<unknown> => ipcRenderer.invoke("screen-keyboard:show", requestId),
        hide: (requestId: string): void => { ipcRenderer.send("screen-keyboard:hide", requestId); }
    },
    quickCapture: {
        take: (mode: "screen" | "area"): Promise<unknown> => ipcRenderer.invoke("quick-capture:take", mode),
        prepare: (): void => { ipcRenderer.send("quick-capture:prepare"); },
        cancel: (): void => { ipcRenderer.send("quick-capture:cancel"); }
    },
    storage: {
        save: (document: unknown): Promise<unknown> => ipcRenderer.invoke("storage:save", document),
        load: (id: string): Promise<unknown> => ipcRenderer.invoke("storage:load", id),
        delete: (id: string): Promise<unknown> => ipcRenderer.invoke("storage:delete", id),
        rename: (id: string, newName: string): Promise<unknown> => ipcRenderer.invoke("storage:rename", id, newName),
        list: (): Promise<unknown> => ipcRenderer.invoke("storage:list")
    },
    onShutdownRequest: (callback: () => void): void => {
        ipcRenderer.on("app:shutdown-request", () => callback());
    },
    shutdownComplete: (): void => {
        ipcRenderer.send("app:shutdown-complete");
    },
    shutdownCancelled: (): void => {
        ipcRenderer.send("app:shutdown-cancelled");
    },
    windowControls: {
        minimize: (): void => {
            ipcRenderer.send("window:minimize");
        },
        toggleMaximize: (): void => {
            ipcRenderer.send("window:toggle-maximize");
        },
        toggleFullscreen: (): void => {
            ipcRenderer.send("window:toggle-fullscreen");
        },
        setFullscreen: (enabled: boolean): void => {
            ipcRenderer.send("window:set-fullscreen", enabled);
        },
        isFullscreen: (): Promise<boolean> => {
            return ipcRenderer.invoke("window:is-fullscreen");
        },
        close: (): void => {
            ipcRenderer.send("window:close");
        },
        onMaximizeChanged: (callback: (maximized: boolean) => void): void => {
            ipcRenderer.on("window:maximize-changed", (_event, maximized: boolean) => callback(maximized));
        },
        onFullscreenChanged: (callback: (fullscreen: boolean) => void): void => {
            ipcRenderer.on("window:fullscreen-changed", (_event, fullscreen: boolean) => callback(fullscreen));
        }
    },
    photoFolder: {
        selectPhoto: (defaultPath?: string): Promise<unknown> => ipcRenderer.invoke("photo:select", defaultPath),
        listPhotos: (folderPath: string): Promise<unknown> => ipcRenderer.invoke("photo:list", folderPath),
        readPhoto: (folderPath: string, fileName: string): Promise<unknown> => {
            return ipcRenderer.invoke("photo:read", folderPath, fileName);
        }
    }
});
