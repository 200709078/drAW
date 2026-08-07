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
    }
});
