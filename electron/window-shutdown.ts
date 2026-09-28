import type { BrowserWindow, IpcMain, IpcMainEvent } from "electron";

export function registerWindowShutdown(window: BrowserWindow, ipcMain: IpcMain): void {

    let pending = false;
    let allowClose = false;

    window.on("close", (event) => {
        if (allowClose) {
            return;
        }

        event.preventDefault();

        if (!pending) {
            pending = true;
            window.webContents.send("app:shutdown-request");
        }
    });

    const complete = (event: IpcMainEvent): void => {
        if (event.sender !== window.webContents || !pending) {
            return;
        }

        pending = false;
        allowClose = true;
        window.close();
    };

    const cancel = (event: IpcMainEvent): void => {
        if (event.sender === window.webContents) {
            pending = false;
        }
    };

    // Süre dolması başarılı kayıt anlamına gelmez; yalnızca renderer onaylayınca kapat.
    ipcMain.on("app:shutdown-complete", complete);
    ipcMain.on("app:shutdown-cancelled", cancel);
    window.once("closed", () => {
        ipcMain.removeListener("app:shutdown-complete", complete);
        ipcMain.removeListener("app:shutdown-cancelled", cancel);
    });

}
