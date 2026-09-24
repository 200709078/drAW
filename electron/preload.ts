import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("drAWDesktop", {
    requestScreenCapture: (): Promise<unknown> => ipcRenderer.invoke("screen-capture:start"),
    cancelScreenCapture: (): void => {
        ipcRenderer.send("screen-capture:cancel");
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
        selectPhoto: (): Promise<unknown> => ipcRenderer.invoke("photo:select"),
        listPhotos: (folderPath: string): Promise<unknown> => ipcRenderer.invoke("photo:list", folderPath),
        readPhoto: (folderPath: string, fileName: string): Promise<unknown> => {
            return ipcRenderer.invoke("photo:read", folderPath, fileName);
        }
    }
});
