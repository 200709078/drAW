import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("drAWDesktop", {
    requestScreenCapture: (): Promise<unknown> => ipcRenderer.invoke("screen-capture:start"),
    cancelScreenCapture: (): void => {
        ipcRenderer.send("screen-capture:cancel");
    }
});
