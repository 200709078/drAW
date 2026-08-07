import { CanvasState } from "./CanvasState";
import type { CanvasStateJson } from "./CanvasState";
import { DrawingMetadata } from "./DrawingMetadata";
import type { DrawingMetadataJson } from "./DrawingMetadata";
import { StorageError } from "./StorageError";
import { StorageErrorKind } from "./StorageError";

export const DOCUMENT_VERSION = 1;

export type ThumbnailData = {
    dataUrl: string;
};

export type DrawingDocumentJson = {
    version: number;
    id: string;
    displayName: string;
    createdAt: string;
    updatedAt: string;
    thumbnail: ThumbnailData | null;
    canvasState: CanvasStateJson;
    metadata: DrawingMetadataJson;
};

function isObject(value: unknown): value is Record<string, unknown> {

    return typeof value === "object" && value !== null && !Array.isArray(value);

}

function isThumbnailData(value: unknown): value is ThumbnailData {

    return isObject(value) && typeof value.dataUrl === "string";

}

export class DrawingDocument {

    private readonly version: number;
    private readonly id: string;
    private readonly displayName: string;
    private readonly createdAt: string;
    private readonly updatedAt: string;
    private readonly thumbnail: ThumbnailData | null;
    private readonly canvasState: CanvasState;
    private readonly metadata: DrawingMetadata;

    constructor(
        version: number,
        id: string,
        displayName: string,
        createdAt: string,
        updatedAt: string,
        thumbnail: ThumbnailData | null,
        canvasState: CanvasState,
        metadata: DrawingMetadata
    ) {

        this.version = version;
        this.id = id;
        this.displayName = displayName;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.thumbnail = thumbnail;
        this.canvasState = canvasState;
        this.metadata = metadata;

    }

    public static create(
        displayName: string,
        canvasState: CanvasState,
        metadata: DrawingMetadata,
        now?: string
    ): DrawingDocument {

        const timestamp = now ?? new Date().toISOString();

        return new DrawingDocument(
            DOCUMENT_VERSION,
            DrawingDocument.createId(),
            displayName,
            timestamp,
            timestamp,
            null,
            canvasState,
            metadata
        );

    }

    public static fromJSON(json: DrawingDocumentJson): DrawingDocument {

        if (!isObject(json)) {
            throw new StorageError(
                StorageErrorKind.CorruptRecord,
                "Kayıt verisi bozuk."
            );
        }

        if (typeof json.version !== "number" || json.version < 1) {
            throw new StorageError(
                StorageErrorKind.CorruptRecord,
                "Kayıt sürümü geçersiz."
            );
        }

        if (
            typeof json.id !== "string" || json.id.length === 0 ||
            typeof json.displayName !== "string" ||
            typeof json.createdAt !== "string" ||
            typeof json.updatedAt !== "string"
        ) {
            throw new StorageError(
                StorageErrorKind.CorruptRecord,
                "Kayıt alanları bozuk."
            );
        }

        const thumbnail = json.thumbnail ?? null;

        if (thumbnail !== null && !isThumbnailData(thumbnail)) {
            throw new StorageError(
                StorageErrorKind.CorruptRecord,
                "Thumbnail verisi bozuk."
            );
        }

        const canvasState = CanvasState.fromJSON(json.canvasState);
        const metadata = DrawingMetadata.fromJSON(json.metadata);

        return new DrawingDocument(
            json.version,
            json.id,
            json.displayName,
            json.createdAt,
            json.updatedAt,
            thumbnail,
            canvasState,
            metadata
        );

    }

    public static createId(): string {

        return crypto.randomUUID();

    }

    public getVersion(): number {

        return this.version;

    }

    public getId(): string {

        return this.id;

    }

    public getDisplayName(): string {

        return this.displayName;

    }

    public getCreatedAt(): string {

        return this.createdAt;

    }

    public getUpdatedAt(): string {

        return this.updatedAt;

    }

    public getThumbnail(): ThumbnailData | null {

        return this.thumbnail;

    }

    public getCanvasState(): CanvasState {

        return this.canvasState;

    }

    public getMetadata(): DrawingMetadata {

        return this.metadata;

    }

    public withDisplayName(displayName: string, now?: string): DrawingDocument {

        return new DrawingDocument(
            this.version,
            this.id,
            displayName,
            this.createdAt,
            now ?? new Date().toISOString(),
            this.thumbnail,
            this.canvasState,
            this.metadata
        );

    }

    public withThumbnail(thumbnail: ThumbnailData | null, now?: string): DrawingDocument {

        return new DrawingDocument(
            this.version,
            this.id,
            this.displayName,
            this.createdAt,
            now ?? new Date().toISOString(),
            thumbnail,
            this.canvasState,
            this.metadata
        );

    }

    public withCanvasState(canvasState: CanvasState, now?: string): DrawingDocument {

        return new DrawingDocument(
            this.version,
            this.id,
            this.displayName,
            this.createdAt,
            now ?? new Date().toISOString(),
            this.thumbnail,
            canvasState,
            this.metadata
        );

    }

    public toJSON(): DrawingDocumentJson {

        return {
            version: this.version,
            id: this.id,
            displayName: this.displayName,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            thumbnail: this.thumbnail,
            canvasState: this.canvasState.toJSON(),
            metadata: this.metadata.toJSON()
        };

    }

}
