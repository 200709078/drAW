import { StorageError } from "./StorageError";
import { StorageErrorKind } from "./StorageError";

export const CANVAS_STATE_VERSION = 1;

export type CanvasStateJson = {
    version: number;
    data: Record<string, unknown>;
};

function isObject(value: unknown): value is Record<string, unknown> {

    return typeof value === "object" && value !== null && !Array.isArray(value);

}

export class CanvasState {

    private readonly version: number;
    private readonly data: Record<string, unknown>;

    constructor(
        version: number,
        data: Record<string, unknown>
    ) {

        this.version = version;
        this.data = data;

    }

    public static create(): CanvasState {

        return new CanvasState(CANVAS_STATE_VERSION, {});

    }

    public static fromJSON(json: CanvasStateJson): CanvasState {

        if (!isObject(json)) {
            throw new StorageError(
                StorageErrorKind.CorruptRecord,
                "Çalışma alanı verisi bozuk."
            );
        }

        if (typeof json.version !== "number" || json.version < 1) {
            throw new StorageError(
                StorageErrorKind.CorruptRecord,
                "Çalışma alanı sürümü geçersiz."
            );
        }

        return new CanvasState(
            json.version,
            isObject(json.data) ? json.data : {}
        );

    }

    public getVersion(): number {

        return this.version;

    }

    public getData(): Record<string, unknown> {

        return this.data;

    }

    public toJSON(): CanvasStateJson {

        return {
            version: this.version,
            data: this.data
        };

    }

}
