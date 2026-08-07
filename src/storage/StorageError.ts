export const StorageErrorKind = {
    Unknown: "unknown",
    IndexedDbAccess: "indexed-db-access",
    FileSystemAccess: "file-system-access",
    DiskFull: "disk-full",
    CorruptRecord: "corrupt-record",
    NotFound: "not-found",
    InvalidArgument: "invalid-argument",
    Unavailable: "unavailable"
} as const;

export type StorageErrorKind = typeof StorageErrorKind[keyof typeof StorageErrorKind];

export class StorageError extends Error {

    private readonly kind: StorageErrorKind;
    private readonly causeError: unknown;

    constructor(
        kind: StorageErrorKind,
        message: string,
        cause?: unknown
    ) {

        super(message);
        this.name = "StorageError";
        this.kind = kind;
        this.causeError = cause;

    }

    public getKind(): StorageErrorKind {

        return this.kind;

    }

    public getCause(): unknown {

        return this.causeError;

    }

    public isKind(kind: StorageErrorKind): boolean {

        return this.kind === kind;

    }

}
