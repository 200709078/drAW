import type { DrawingDocumentJson } from "../storage/DrawingDocument";
import type { StorageErrorKind } from "../storage/StorageError";

export type ScreenCaptureResult = {
    dataUrl: string;
    width: number;
    height: number;
};

export type StorageOperationError = {
    kind: StorageErrorKind;
    message: string;
};

export type StorageOperationResult<T> =
    | { ok: true; value: T }
    | { ok: false; error: StorageOperationError };

export type ElectronStorageBridge = {
    save: (document: DrawingDocumentJson) => Promise<StorageOperationResult<void>>;
    load: (id: string) => Promise<StorageOperationResult<DrawingDocumentJson | null>>;
    delete: (id: string) => Promise<StorageOperationResult<void>>;
    rename: (id: string, newName: string) => Promise<StorageOperationResult<void>>;
    list: () => Promise<StorageOperationResult<DrawingDocumentJson[]>>;
};

declare global {
    interface Window {
        drAWDesktop?: {
            requestScreenCapture: () => Promise<ScreenCaptureResult | null>;
            cancelScreenCapture: () => void;
            storage: ElectronStorageBridge;
            onShutdownRequest: (callback: () => void) => void;
            shutdownComplete: () => void;
        };
    }
}

export {};
