import { DrawingDocument } from "../DrawingDocument";
import type { DrawingDocumentJson } from "../DrawingDocument";
import type { Storage } from "../Storage";
import { StorageError } from "../StorageError";
import { StorageErrorKind } from "../StorageError";
import {
    STORAGE_DATABASE_NAME,
    STORAGE_DATABASE_VERSION,
    STORAGE_OBJECT_STORE_NAME
} from "../constants";

export class WebStorageProvider implements Storage {

    private database: IDBDatabase | null;

    constructor() {

        this.database = null;

    }

    public async save(document: DrawingDocument): Promise<void> {

        const database = await this.openDatabase();

        await new Promise<void>((resolve, reject) => {
            const transaction = database.transaction(STORAGE_OBJECT_STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORAGE_OBJECT_STORE_NAME);
            const request = store.put(document.toJSON());

            request.onsuccess = () => {
                resolve();
            };
            request.onerror = () => {
                reject(this.mapIndexedDbError(request.error, "Kayıt kaydedilemedi."));
            };
        });

    }

    public async load(id: string): Promise<DrawingDocument | null> {

        const database = await this.openDatabase();

        const result = await new Promise<unknown>((resolve, reject) => {
            const transaction = database.transaction(STORAGE_OBJECT_STORE_NAME, "readonly");
            const store = transaction.objectStore(STORAGE_OBJECT_STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(this.mapIndexedDbError(request.error, "Kayıt yüklenemedi."));
            };
        });

        if (result === undefined) {
            return null;
        }

        return DrawingDocument.fromJSON(result as DrawingDocumentJson);

    }

    public async delete(id: string): Promise<void> {

        const database = await this.openDatabase();

        await new Promise<void>((resolve, reject) => {
            const transaction = database.transaction(STORAGE_OBJECT_STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORAGE_OBJECT_STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };
            request.onerror = () => {
                reject(this.mapIndexedDbError(request.error, "Kayıt silinemedi."));
            };
        });

    }

    public async rename(id: string, newName: string): Promise<void> {

        const document = await this.load(id);

        if (document === null) {
            throw new StorageError(
                StorageErrorKind.NotFound,
                `"${id}" kimlikli kayıt bulunamadı.`
            );
        }

        await this.save(document.withDisplayName(newName));

    }

    public async list(): Promise<DrawingDocument[]> {

        const database = await this.openDatabase();

        const rows = await new Promise<unknown>((resolve, reject) => {
            const transaction = database.transaction(STORAGE_OBJECT_STORE_NAME, "readonly");
            const store = transaction.objectStore(STORAGE_OBJECT_STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = () => {
                reject(this.mapIndexedDbError(request.error, "Kayıtlar listelenemedi."));
            };
        });

        return (rows as DrawingDocumentJson[]).map((row) => DrawingDocument.fromJSON(row));

    }

    private openDatabase(): Promise<IDBDatabase> {

        if (this.database !== null) {
            return Promise.resolve(this.database);
        }

        return new Promise<IDBDatabase>((resolve, reject) => {
            if (typeof indexedDB === "undefined") {
                reject(new StorageError(
                    StorageErrorKind.Unavailable,
                    "IndexedDB bu ortamda kullanılamıyor."
                ));

                return;
            }

            const request = indexedDB.open(STORAGE_DATABASE_NAME, STORAGE_DATABASE_VERSION);

            request.onupgradeneeded = () => {
                const database = request.result;

                if (!database.objectStoreNames.contains(STORAGE_OBJECT_STORE_NAME)) {
                    database.createObjectStore(STORAGE_OBJECT_STORE_NAME, { keyPath: "id" });
                }
            };

            request.onsuccess = () => {
                this.database = request.result;
                resolve(request.result);
            };

            request.onerror = () => {
                reject(this.mapIndexedDbError(request.error, "Depolama veritabanı açılamadı."));
            };
        });

    }

    private mapIndexedDbError(error: DOMException | null, message: string): StorageError {

        if (error !== null && error.name === "QuotaExceededError") {
            return new StorageError(
                StorageErrorKind.DiskFull,
                "Depolama alanı dolu.",
                error
            );
        }

        return new StorageError(
            StorageErrorKind.IndexedDbAccess,
            message,
            error
        );

    }

}
