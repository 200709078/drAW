import type { Storage } from "./Storage";
import { DrawingDocument } from "./DrawingDocument";
import { CanvasState } from "./CanvasState";
import { DrawingMetadata } from "./DrawingMetadata";
import { DirtyFlag } from "./DirtyFlag";
import { RecordLimiter } from "./RecordLimiter";

export class DrawingRepository {

    private readonly storage: Storage;
    private readonly limiter: RecordLimiter;
    private readonly dirtyFlag: DirtyFlag;

    constructor(
        storage: Storage,
        limiter?: RecordLimiter
    ) {

        this.storage = storage;
        this.limiter = limiter ?? new RecordLimiter();
        this.dirtyFlag = new DirtyFlag();

    }

    public getLimiter(): RecordLimiter {

        return this.limiter;

    }

    public getDirtyFlag(): DirtyFlag {

        return this.dirtyFlag;

    }

    public async createDocument(
        displayName: string,
        canvasState: CanvasState,
        metadata: DrawingMetadata,
        now?: string
    ): Promise<DrawingDocument> {

        const document = DrawingDocument.create(displayName, canvasState, metadata, now);

        return await this.saveNewDocument(document);

    }

    public async saveNewDocument(document: DrawingDocument): Promise<DrawingDocument> {

        const existing = await this.storage.list();
        const evictions = this.limiter.getEvictionCandidates(existing, 1);

        for (const record of evictions) {
            await this.storage.delete(record.getId());
        }

        await this.storage.save(document);
        this.dirtyFlag.markClean();

        return document;

    }

    public async saveDocument(document: DrawingDocument): Promise<void> {

        await this.storage.save(document);
        this.dirtyFlag.markClean();

    }

    public async loadDocument(id: string): Promise<DrawingDocument | null> {

        return await this.storage.load(id);

    }

    public async deleteDocument(id: string): Promise<void> {

        await this.storage.delete(id);
        this.dirtyFlag.markClean();

    }

    public async renameDocument(id: string, newName: string): Promise<void> {

        await this.storage.rename(id, newName);

    }

    public async listDocuments(): Promise<DrawingDocument[]> {

        return await this.storage.list();

    }

    public markDirty(): void {

        this.dirtyFlag.markDirty();

    }

}
