import { DrawingRepository } from "../storage/DrawingRepository";
import { DrawingDocument } from "../storage/DrawingDocument";
import { CanvasState, CANVAS_STATE_VERSION } from "../storage/CanvasState";
import { DrawingMetadata } from "../storage/DrawingMetadata";
import { Document } from "../document/Document";
import { HistoryManager } from "../core/HistoryManager";
import { DocumentStateSerializer } from "./DocumentStateSerializer";
import { generateDisplayName } from "./displayName";

export class AutoSaveManager {

    private static readonly AUTOSAVE_INTERVAL_MS = 10000;
    private static readonly AUTOSAVE_BATTERY_INTERVAL_MS = 30000;

    private readonly repository: DrawingRepository;
    private readonly document: Document;
    private readonly serializer: DocumentStateSerializer;
    private readonly saveListeners: Set<() => void>;

    private activeDocument: DrawingDocument | null;
    private persisted: boolean;
    private saving: Promise<void> | null;
    private autosaveTimer: ReturnType<typeof setInterval> | null;

    constructor(
        repository: DrawingRepository,
        document: Document,
        history: HistoryManager,
        serializer?: DocumentStateSerializer
    ) {

        this.repository = repository;
        this.document = document;
        this.serializer = serializer ?? new DocumentStateSerializer();
        this.saveListeners = new Set();

        this.activeDocument = null;
        this.persisted = false;
        this.saving = null;
        this.autosaveTimer = null;

        history.addChangeListener(() => this.onDocumentChanged());
        this.startAutoSave();

    }

    public getActiveDocument(): DrawingDocument | null {

        return this.activeDocument;

    }

    public isDirty(): boolean {

        return this.repository.getDirtyFlag().isDirty();

    }

    public saveIfNeeded(): Promise<void> {

        if (this.saving !== null) {
            return this.saving;
        }

        if (!this.isDirty()) {
            return Promise.resolve();
        }

        this.saving = this.persistActiveDocument().finally(() => {
            this.saving = null;
        });

        return this.saving;

    }

    public async shutdown(): Promise<void> {

        this.stopAutoSave();
        await this.saveIfNeeded();

    }

    public addSaveListener(listener: () => void): void {

        this.saveListeners.add(listener);

    }

    public removeSaveListener(listener: () => void): void {

        this.saveListeners.delete(listener);

    }

    public async newDrawing(): Promise<void> {

        await this.saveIfNeeded();

    }

    public resetActiveDocument(): void {

        this.activeDocument = this.createDocument();
        this.persisted = false;
        this.repository.getDirtyFlag().markClean();

    }

    public async openDrawing(stored: DrawingDocument): Promise<void> {

        if (this.activeDocument !== null && this.activeDocument.getId() === stored.getId()) {
            return;
        }

        await this.saveIfNeeded();

        const snapshot = this.serializer.deserialize(stored.getCanvasState().getData());

        this.document.restoreSnapshot(snapshot);
        this.activeDocument = stored;
        this.persisted = true;
        this.repository.getDirtyFlag().markClean();

    }

    private startAutoSave(): void {

        if (this.autosaveTimer !== null) {
            return;
        }

        const start = (intervalMs: number): void => {
            this.stopAutoSave();
            this.autosaveTimer = setInterval(() => {
                void this.saveIfNeeded();
            }, intervalMs);
        };

        start(AutoSaveManager.AUTOSAVE_INTERVAL_MS);

        // Pilde daha seyrek kaydet.
        try {
            const navigatorWithBattery = navigator as Navigator & {
                getBattery?: () => Promise<{
                    charging: boolean;
                    addEventListener: (type: string, listener: () => void) => void;
                }>;
            };

            if (typeof navigatorWithBattery.getBattery === "function") {
                void navigatorWithBattery.getBattery().then((battery) => {
                    const applyInterval = (): void => {
                        start(battery.charging
                            ? AutoSaveManager.AUTOSAVE_INTERVAL_MS
                            : AutoSaveManager.AUTOSAVE_BATTERY_INTERVAL_MS);
                    };

                    battery.addEventListener("chargingchange", applyInterval);
                    applyInterval();
                }).catch(() => undefined);
            }
        } catch {
            // yok say, varsayılan aralıkla devam et
        }

    }

    private stopAutoSave(): void {

        if (this.autosaveTimer !== null) {
            clearInterval(this.autosaveTimer);
            this.autosaveTimer = null;
        }

    }

    private onDocumentChanged(): void {

        if (this.activeDocument === null) {
            this.activeDocument = this.createDocument();
            this.persisted = false;
        }

        this.repository.getDirtyFlag().markDirty();

    }

    private createDocument(): DrawingDocument {

        const state = this.serializer.serialize(this.document.createSnapshot());
        const now = new Date().toISOString();

        return DrawingDocument.create(
            generateDisplayName(),
            new CanvasState(CANVAS_STATE_VERSION, state),
            DrawingMetadata.create(),
            now
        );

    }

    private async persistActiveDocument(): Promise<void> {

        let saved = false;

        try {
            if (this.activeDocument === null) {
                this.activeDocument = this.createDocument();
                this.persisted = false;
            }

            const snapshot = this.document.createSnapshot();

            if (!this.persisted && this.serializer.isEmpty(snapshot)) {
                return;
            }

            const canvasState = new CanvasState(
                this.activeDocument.getCanvasState().getVersion(),
                this.serializer.serialize(snapshot)
            );

            if (!this.persisted) {
                this.activeDocument = await this.repository.saveNewDocument(
                    this.activeDocument.withCanvasState(canvasState)
                );
                this.persisted = true;
                saved = true;

                return;
            }

            this.activeDocument = this.activeDocument.withCanvasState(canvasState);
            await this.repository.saveDocument(this.activeDocument);
            saved = true;
        } catch (error) {
            console.error("[AutoSave] Kayıt sırasında hata oluştu:", error);
        }

        if (saved) {
            for (const listener of this.saveListeners) {
                try {
                    listener();
                } catch {
                    // dinleyici hataları kayıt akışını etkilemesin
                }
            }
        }

    }

}
