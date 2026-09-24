import path from "node:path";
import { createRequire } from "node:module";
import { ScreenCaptureService } from "./screen-capture.ts";
import { registerPhotoFolderHandlers } from "./photo-folder.ts";
import { ElectronStorageService } from "./storage/ElectronStorageService.ts";
import { StorageError } from "./storage/StorageError.ts";

const electron = createRequire(import.meta.url)("electron") as typeof import("electron");
const { app, BrowserWindow, ipcMain } = electron;

if (!app.isPackaged) {
    app.setName("drAW");
    app.commandLine.appendSwitch("class", "drAW");
}
const screenCaptureService = new ScreenCaptureService();
const storageService = new ElectronStorageService();

type StorageOperationError = {
    kind: string;
    message: string;
};

type StorageOperationResult<T> =
    | { ok: true; value: T }
    | { ok: false; error: StorageOperationError };

async function runStorageOperation<T>(
    operation: () => Promise<T>
): Promise<StorageOperationResult<T>> {

    try {
        return { ok: true, value: await operation() };
    } catch (error) {
        if (error instanceof StorageError) {
            return {
                ok: false,
                error: {
                    kind: error.getKind(),
                    message: error.message
                }
            };
        }

        return {
            ok: false,
            error: {
                kind: "unknown",
                message: "Bilinmeyen depolama hatası."
            }
        };
    }

}

function registerStorageHandlers(): void {

    ipcMain.handle("storage:save", async (_event, document) => {
        return await runStorageOperation(() => storageService.save(document));
    });

    ipcMain.handle("storage:load", async (_event, id: string) => {
        return await runStorageOperation(() => storageService.load(id));
    });

    ipcMain.handle("storage:delete", async (_event, id: string) => {
        return await runStorageOperation(() => storageService.delete(id));
    });

    ipcMain.handle("storage:rename", async (_event, id: string, newName: string) => {
        return await runStorageOperation(() => storageService.rename(id, newName));
    });

    ipcMain.handle("storage:list", async () => {
        return await runStorageOperation(() => storageService.list());
    });

}

function getBasePath(): string {
    return app.isPackaged ? app.getAppPath() : process.cwd();
}

function getAppPath(...segments: string[]): string {
    return path.join(getBasePath(), ...segments);
}

function registerWindowControls(): void {

    ipcMain.on("window:minimize", (event) => {
        BrowserWindow.fromWebContents(event.sender)?.minimize();
    });

    ipcMain.on("window:toggle-maximize", (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);

        if (window === null || window === undefined) {
            return;
        }

        if (window.isMaximized()) {
            window.unmaximize();
        } else {
            window.maximize();
        }
    });

    ipcMain.on("window:close", (event) => {
        BrowserWindow.fromWebContents(event.sender)?.close();
    });

    ipcMain.on("window:toggle-fullscreen", (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);

        if (window === null || window === undefined) {
            return;
        }

        window.setFullScreen(!window.isFullScreen());
    });

    ipcMain.on("window:set-fullscreen", (event, enabled: unknown) => {
        const window = BrowserWindow.fromWebContents(event.sender);

        if (window === null || window === undefined) {
            return;
        }

        window.setFullScreen(enabled === true);
    });

    ipcMain.handle("window:is-fullscreen", (event) => {
        return BrowserWindow.fromWebContents(event.sender)?.isFullScreen() ?? false;
    });

}

function createWindow(): void {

    const iconPath = getAppPath(
        "electron",
        "assets",
        "app-icons",
        "draw.png"
    );

    const window = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "mADEMatik | drAW",
        minWidth: 800,
        minHeight: 600,
        autoHideMenuBar: true,
        frame: false,
        titleBarStyle: "hidden",
        fullscreenable: true,
        fullscreen: true,
        icon: iconPath,
        webPreferences: {
            preload: getAppPath(
                "electron",
                "preload.cjs"
            ),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    allowWindowClose = false;

    window.on("maximize", () => {
        window.webContents.send("window:maximize-changed", true);
    });

    window.on("unmaximize", () => {
        window.webContents.send("window:maximize-changed", false);
    });

    window.on("enter-full-screen", () => {
        window.webContents.send("window:fullscreen-changed", true);
    });

    window.on("leave-full-screen", () => {
        window.webContents.send("window:fullscreen-changed", false);
    });

    // F11: gerçek tam ekran (görev çubuğu arka planda kalır)
    window.webContents.on("before-input-event", (event, input) => {
        if (input.key === "F11" && input.type === "keyDown") {
            event.preventDefault();
            window.setFullScreen(!window.isFullScreen());
        }
    });

    window.on("close", (event) => {
        if (allowWindowClose) {
            return;
        }

        event.preventDefault();
        window.webContents.send("app:shutdown-request");

        shutdownTimer = setTimeout(() => {
            allowWindowClose = true;
            window.close();
        }, 3000);
    });

    const indexPath = getAppPath(
        "dist",
        "index.html"
    );

    window.loadFile(indexPath);
}

let allowWindowClose = false;
let shutdownTimer: ReturnType<typeof setTimeout> | null = null;

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

    registerStorageHandlers();
    registerWindowControls();
    registerPhotoFolderHandlers();

    ipcMain.on("app:shutdown-complete", (event) => {
        if (shutdownTimer !== null) {
            clearTimeout(shutdownTimer);
            shutdownTimer = null;
        }

        const window = BrowserWindow.fromWebContents(event.sender);

        allowWindowClose = true;
        window?.close();
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
