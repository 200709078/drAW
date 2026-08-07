import { DrawingDocument } from "../DrawingDocument";
import type { Storage } from "../Storage";
import { StorageError } from "../StorageError";
import { StorageErrorKind } from "../StorageError";
import type { ElectronStorageBridge, StorageOperationResult } from "../../types/electron-api";

export class ElectronStorageProvider implements Storage {

    public async save(document: DrawingDocument): Promise<void> {

        const result = await this.getBridge().save(document.toJSON());
        this.unwrap(result);

    }

    public async load(id: string): Promise<DrawingDocument | null> {

        const result = await this.getBridge().load(id);
        const json = this.unwrap(result);

        if (json === null) {
            return null;
        }

        return DrawingDocument.fromJSON(json);

    }

    public async delete(id: string): Promise<void> {

        const result = await this.getBridge().delete(id);
        this.unwrap(result);

    }

    public async rename(id: string, newName: string): Promise<void> {

        const result = await this.getBridge().rename(id, newName);
        this.unwrap(result);

    }

    public async list(): Promise<DrawingDocument[]> {

        const result = await this.getBridge().list();
        const rows = this.unwrap(result);

        return rows.map((row) => DrawingDocument.fromJSON(row));

    }

    private getBridge(): ElectronStorageBridge {

        const bridge = window.drAWDesktop?.storage;

        if (bridge === undefined) {
            throw new StorageError(
                StorageErrorKind.Unavailable,
                "Electron depolama köprüsü kullanılamıyor."
            );
        }

        return bridge;

    }

    private unwrap<T>(result: StorageOperationResult<T>): T {

        if (result.ok) {
            return result.value;
        }

        throw new StorageError(
            result.error.kind,
            result.error.message
        );

    }

}
