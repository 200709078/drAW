import path from "node:path";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { StorageError, StorageErrorKind } from "./StorageError.ts";

const electron = createRequire(import.meta.url)("electron") as typeof import("electron");
const { app } = electron;

const DRAWINGS_DIRECTORY = "drawings";
const THUMBNAILS_DIRECTORY = "thumbnails";
const SETTINGS_FILE = "settings.json";

const DRAWING_EXTENSION = ".draw.json";
const THUMBNAIL_EXTENSION = ".webp";

const THUMBNAIL_DATA_URL_PREFIX = "data:image/webp;base64,";

type ThumbnailData = {
    dataUrl: string;
};

export type StoredDrawingDocument = {
    version: number;
    id: string;
    displayName: string;
    createdAt: string;
    updatedAt: string;
    thumbnail: ThumbnailData | null;
    canvasState: Record<string, unknown>;
    metadata: Record<string, unknown>;
};

export class ElectronStorageService {

    public async save(document: StoredDrawingDocument): Promise<void> {

        try {
            await mkdir(this.getDrawingsDirectory(), { recursive: true });
            await mkdir(this.getThumbnailsDirectory(), { recursive: true });

            const drawingPayload = { ...document, thumbnail: null };
            await writeFile(
                this.getDrawingPath(document.id),
                JSON.stringify(drawingPayload, null, 2),
                "utf8"
            );

            const thumbnail = document.thumbnail;

            if (thumbnail !== null) {
                const base64 = this.extractBase64(thumbnail.dataUrl);
                await writeFile(
                    this.getThumbnailPath(document.id),
                    Buffer.from(base64, "base64")
                );
            } else {
                await rm(this.getThumbnailPath(document.id), { force: true });
            }
        } catch (error) {
            throw this.mapError(error, "Kayıt kaydedilemedi.");
        }

    }

    public async load(id: string): Promise<StoredDrawingDocument | null> {

        if (!(await this.fileExists(this.getDrawingPath(id)))) {
            return null;
        }

        try {
            const raw = await readFile(this.getDrawingPath(id), "utf8");
            const document = JSON.parse(raw) as StoredDrawingDocument;

            if (!this.isValidDocument(document, id)) {
                throw new StorageError(
                    StorageErrorKind.CorruptRecord,
                    `"${id}" kimlikli kayıt bozuk.`
                );
            }

            document.thumbnail = await this.readThumbnail(id);

            return document;
        } catch (error) {
            if (error instanceof StorageError) {
                throw error;
            }

            if (error instanceof SyntaxError) {
                throw new StorageError(
                    StorageErrorKind.CorruptRecord,
                    `"${id}" kimlikli kayıt bozuk.`,
                    error
                );
            }

            throw this.mapError(error, "Kayıt yüklenemedi.");
        }

    }

    public async delete(id: string): Promise<void> {

        try {
            await rm(this.getDrawingPath(id), { force: true });
            await rm(this.getThumbnailPath(id), { force: true });
        } catch (error) {
            throw this.mapError(error, "Kayıt silinemedi.");
        }

    }

    public async rename(id: string, newName: string): Promise<void> {

        const document = await this.load(id);

        if (document === null) {
            throw new StorageError(
                StorageErrorKind.NotFound,
                `"${id}" kimlikli kayıt bulunamadı.`
            );
        }

        await this.save({
            ...document,
            displayName: newName,
            updatedAt: new Date().toISOString()
        });

    }

    public async list(): Promise<StoredDrawingDocument[]> {

        await mkdir(this.getDrawingsDirectory(), { recursive: true });

        let entries;

        try {
            entries = await readdir(this.getDrawingsDirectory(), { withFileTypes: true });
        } catch (error) {
            throw this.mapError(error, "Kayıtlar listelenemedi.");
        }

        const documents: StoredDrawingDocument[] = [];

        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith(DRAWING_EXTENSION)) {
                continue;
            }

            const id = entry.name.slice(0, -DRAWING_EXTENSION.length);
            const document = await this.load(id);

            if (document !== null) {
                documents.push(document);
            }
        }

        return documents;

    }

    public getDrawingsDirectory(): string {

        return path.join(app.getPath("userData"), DRAWINGS_DIRECTORY);

    }

    public getThumbnailsDirectory(): string {

        return path.join(app.getPath("userData"), THUMBNAILS_DIRECTORY);

    }

    public getSettingsPath(): string {

        return path.join(app.getPath("userData"), SETTINGS_FILE);

    }

    private getDrawingPath(id: string): string {

        return path.join(this.getDrawingsDirectory(), `${id}${DRAWING_EXTENSION}`);

    }

    private getThumbnailPath(id: string): string {

        return path.join(this.getThumbnailsDirectory(), `${id}${THUMBNAIL_EXTENSION}`);

    }

    private async fileExists(filePath: string): Promise<boolean> {

        try {
            await readFile(filePath);

            return true;
        } catch {
            return false;
        }

    }

    private async readThumbnail(id: string): Promise<ThumbnailData | null> {

        const thumbnailPath = this.getThumbnailPath(id);

        if (!(await this.fileExists(thumbnailPath))) {
            return null;
        }

        const buffer = await readFile(thumbnailPath);

        return {
            dataUrl: `${THUMBNAIL_DATA_URL_PREFIX}${buffer.toString("base64")}`
        };

    }

    private extractBase64(dataUrl: string): string {

        const separatorIndex = dataUrl.indexOf(",");

        if (separatorIndex === -1) {
            throw new StorageError(
                StorageErrorKind.InvalidArgument,
                "Geçersiz thumbnail verisi."
            );
        }

        return dataUrl.slice(separatorIndex + 1);

    }

    private isValidDocument(document: StoredDrawingDocument, id: string): boolean {

        return typeof document === "object" &&
            document !== null &&
            typeof document.version === "number" &&
            document.version >= 1 &&
            document.id === id &&
            typeof document.displayName === "string" &&
            typeof document.createdAt === "string" &&
            typeof document.updatedAt === "string";

    }

    private mapError(error: unknown, message: string): StorageError {

        if (error instanceof StorageError) {
            return error;
        }

        const nodeError = error as { code?: string };

        if (nodeError?.code === "ENOSPC") {
            return new StorageError(
                StorageErrorKind.DiskFull,
                "Disk alanı dolu.",
                error
            );
        }

        if (nodeError?.code === "EACCES" || nodeError?.code === "EPERM") {
            return new StorageError(
                StorageErrorKind.FileSystemAccess,
                "Dosya sistemine erişim reddedildi.",
                error
            );
        }

        return new StorageError(
            StorageErrorKind.FileSystemAccess,
            message,
            error
        );

    }

}
