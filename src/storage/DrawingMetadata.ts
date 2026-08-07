import { StorageError } from "./StorageError";
import { StorageErrorKind } from "./StorageError";

export type DrawingMetadataJson = Record<string, unknown>;

function isObject(value: unknown): value is Record<string, unknown> {

    return typeof value === "object" && value !== null && !Array.isArray(value);

}

export class DrawingMetadata {

    private readonly values: Record<string, unknown>;

    constructor(values: Record<string, unknown>) {

        this.values = values;

    }

    public static create(): DrawingMetadata {

        return new DrawingMetadata({});

    }

    public static fromJSON(json: DrawingMetadataJson): DrawingMetadata {

        if (!isObject(json)) {
            throw new StorageError(
                StorageErrorKind.CorruptRecord,
                "Meta veri yapısı bozuk."
            );
        }

        return new DrawingMetadata({ ...json });

    }

    public getValue(key: string): unknown {

        return this.values[key];

    }

    public setValue(key: string, value: unknown): void {

        this.values[key] = value;

    }

    public getValues(): Record<string, unknown> {

        return { ...this.values };

    }

    public toJSON(): DrawingMetadataJson {

        return { ...this.values };

    }

}
