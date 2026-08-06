import path from "node:path";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { ScreenCaptureService } from "./screen-capture.ts";

const electron = createRequire(import.meta.url)("electron") as typeof import("electron");
const { app, BrowserWindow, ipcMain } = electron;
const screenCaptureService = new ScreenCaptureService();

function createWindow(): void {

    const iconPath = path.join(process.cwd(), "electron/assets/app-icons/draw.png");
    
    const window = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "drAW",
        minWidth: 800,
        minHeight: 600,
        autoHideMenuBar: true,
        icon: iconPath,
        webPreferences: {
            preload: path.join(process.cwd(), "electron", "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    const indexPath = path.join(
        process.cwd(),
        "dist",
        "index.html"
    );

    window.loadFile(indexPath);
}

app.whenReady().then(() => {
    ipcMain.handle("screen-capture:start", (event) => {
        return screenCaptureService.start(event.sender);
    });
    ipcMain.on("screen-capture:complete", (event, selection) => {
        screenCaptureService.complete(event.sender, selection);
    });
    ipcMain.on("screen-capture:cancel", (event) => {
        screenCaptureService.cancel(event.sender);
    });

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
