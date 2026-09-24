import path from "node:path";
import { promises as fileSystem } from "node:fs";
import { createRequire } from "node:module";
import type { BrowserWindow as ElectronBrowserWindow, IpcMain } from "electron";

const electron = createRequire(import.meta.url)("electron") as typeof import("electron");
const { BrowserWindow, dialog, ipcMain, nativeImage } = electron;

const IMAGE_EXTENSIONS = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".bmp"
]);

const IGNORED_FILES = new Set([
    "thumbs.db",
    ".ds_store",
    "desktop.ini"
]);

const MAX_PHOTO_EDGE = 1920;

function isPhotoFile(fileName: string): boolean {

    if (fileName.startsWith(".")) {
        return false;
    }

    if (IGNORED_FILES.has(fileName.toLowerCase())) {
        return false;
    }

    return IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());

}

function compareNatural(first: string, second: string): number {

    return first.localeCompare(second, "tr", { numeric: true });

}

function mimeForExtension(extension: string): string {

    switch (extension) {
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";
        case ".png":
            return "image/png";
        case ".webp":
            return "image/webp";
        case ".gif":
            return "image/gif";
        case ".bmp":
            return "image/bmp";
        default:
            return "image/jpeg";
    }

}

async function listPhotoFiles(folderPath: string): Promise<string[]> {

    const entries = await fileSystem.readdir(folderPath, { withFileTypes: true });
    const files = entries
        .filter((entry) => entry.isFile() && isPhotoFile(entry.name))
        .map((entry) => entry.name);

    files.sort(compareNatural);

    return files;

}

function resolvePhotoPath(folderPath: string, fileName: string): string | null {

    if (path.basename(fileName) !== fileName) {
        return null;
    }

    const resolvedFolder = path.resolve(folderPath);
    const resolvedFile = path.resolve(resolvedFolder, fileName);

    if (path.dirname(resolvedFile) !== resolvedFolder) {
        return null;
    }

    return resolvedFile;

}

export function registerPhotoFolderHandlers(ipc: IpcMain = ipcMain): void {

    ipc.handle("photo:select", async (event, defaultPath: unknown) => {
        const owner: ElectronBrowserWindow | null = BrowserWindow.fromWebContents(event.sender);

        const options = {
            title: "Fotoğraf Seç",
            properties: ["openFile"] as Array<"openFile">,
            filters: [
                { name: "Fotoğraflar", extensions: ["jpg", "jpeg", "png", "webp", "gif", "bmp"] }
            ],
            ...(typeof defaultPath === "string" && defaultPath !== "" ? { defaultPath } : {})
        };
        const result = owner === null
            ? await dialog.showOpenDialog(options)
            : await dialog.showOpenDialog(owner, options);

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        const filePath = result.filePaths[0];

        return {
            folderPath: path.dirname(filePath),
            fileName: path.basename(filePath)
        };
    });

    ipc.handle("photo:list", async (_event, folderPath: unknown) => {
        try {
            if (typeof folderPath !== "string" || folderPath === "") {
                return [];
            }

            return await listPhotoFiles(folderPath);
        } catch (error) {
            console.error("[PhotoFolder] Klasör listelenemedi:", error);

            return [];
        }
    });

    ipc.handle("photo:read", async (_event, folderPath: unknown, fileName: unknown) => {
        try {
            if (typeof folderPath !== "string" || typeof fileName !== "string") {
                return null;
            }

            const filePath = resolvePhotoPath(folderPath, fileName);

            if (filePath === null) {
                return null;
            }

            const buffer = await fileSystem.readFile(filePath);
            const image = nativeImage.createFromBuffer(buffer);

            if (image.isEmpty()) {
                return null;
            }

            const size = image.getSize();
            const longEdge = Math.max(size.width, size.height);

            if (longEdge <= MAX_PHOTO_EDGE || size.width === 0 || size.height === 0) {
                const extension = path.extname(fileName).toLowerCase();

                return {
                    dataUrl: `data:${mimeForExtension(extension)};base64,${buffer.toString("base64")}`,
                    width: size.width,
                    height: size.height
                };
            }

            const scale = MAX_PHOTO_EDGE / longEdge;
            const resized = image.resize({
                width: Math.max(1, Math.round(size.width * scale)),
                height: Math.max(1, Math.round(size.height * scale)),
                quality: "good"
            });

            if (resized.isEmpty()) {
                return null;
            }

            const resizedSize = resized.getSize();

            return {
                dataUrl: resized.toJPEG(85),
                width: resizedSize.width,
                height: resizedSize.height
            };
        } catch (error) {
            console.error("[PhotoFolder] Fotoğraf okunamadı:", error);

            return null;
        }
    });

}
