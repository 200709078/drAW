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

export class StorageError extends Error {

    private readonly kind: string;
    private readonly causeError: unknown;

    constructor(
        kind: string,
        message: string,
        cause?: unknown
    ) {

        super(message);
        this.name = "StorageError";
        this.kind = kind;
        this.causeError = cause;

    }

    public getKind(): string {

        return this.kind;

    }

    public getCause(): unknown {

        return this.causeError;

    }

}
