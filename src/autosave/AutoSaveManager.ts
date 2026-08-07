import { DrawingRepository } from "../storage/DrawingRepository";
import { DrawingDocument } from "../storage/DrawingDocument";
import { CanvasState, CANVAS_STATE_VERSION } from "../storage/CanvasState";
import { DrawingMetadata } from "../storage/DrawingMetadata";
import { Document } from "../document/Document";
import { HistoryManager } from "../core/HistoryManager";
import { DocumentStateSerializer } from "./DocumentStateSerializer";
import { generateDisplayName } from "./displayName";

export class AutoSaveManager {

    private readonly repository: DrawingRepository;
    private readonly document: Document;
    private readonly serializer: DocumentStateSerializer;

    private activeDocument: DrawingDocument | null;
    private persisted: boolean;
    private saving: Promise<void> | null;

    constructor(
        repository: DrawingRepository,
        document: Document,
        history: HistoryManager,
        serializer?: DocumentStateSerializer
    ) {

        this.repository = repository;
        this.document = document;
        this.serializer = serializer ?? new DocumentStateSerializer();

        this.activeDocument = null;
        this.persisted = false;
        this.saving = null;

        history.addChangeListener(() => this.onDocumentChanged());

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

        await this.saveIfNeeded();

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

                return;
            }

            this.activeDocument = this.activeDocument.withCanvasState(canvasState);
            await this.repository.saveDocument(this.activeDocument);
        } catch (error) {
            console.error("[AutoSave] Kayıt sırasında hata oluştu:", error);
        }

    }

}
