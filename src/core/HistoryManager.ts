import { Document } from "../document/Document";
import type { DocumentSnapshot } from "../document/Document";

type HistoryEntry = {
    before: DocumentSnapshot;
    after: DocumentSnapshot;
};

export class HistoryManager {

    private static readonly MAX_ENTRIES = 100;

    private readonly drawingDocument: Document;
    private readonly undoStack: HistoryEntry[];
    private readonly redoStack: HistoryEntry[];
    private pendingSnapshot: DocumentSnapshot | null;
    private readonly listeners: Set<() => void>;

    constructor(drawingDocument: Document) {

        this.drawingDocument = drawingDocument;
        this.undoStack = [];
        this.redoStack = [];
        this.pendingSnapshot = null;
        this.listeners = new Set();

    }

    public begin(): void {

        if (this.pendingSnapshot === null) {
            this.pendingSnapshot = this.drawingDocument.createSnapshot();
        }

    }

    public commit(): void {

        if (this.pendingSnapshot === null) {
            return;
        }

        const before = this.pendingSnapshot;
        const after = this.drawingDocument.createSnapshot();
        this.pendingSnapshot = null;

        if (this.drawingDocument.snapshotsMatch(before, after)) {
            return;
        }

        this.undoStack.push({ before, after });

        if (this.undoStack.length > HistoryManager.MAX_ENTRIES) {
            this.undoStack.shift();
        }

        this.redoStack.length = 0;
        this.notify();

    }

    public discard(): void {

        this.pendingSnapshot = null;

    }

    public reset(): void {

        this.pendingSnapshot = null;
        this.undoStack.length = 0;
        this.redoStack.length = 0;
        this.notify();

    }

    public undo(): boolean {

        this.discard();
        const entry = this.undoStack.pop();

        if (entry === undefined) {
            return false;
        }

        this.drawingDocument.restoreSnapshot(entry.before);
        this.redoStack.push(entry);
        this.notify();

        return true;

    }

    public redo(): boolean {

        this.discard();
        const entry = this.redoStack.pop();

        if (entry === undefined) {
            return false;
        }

        this.drawingDocument.restoreSnapshot(entry.after);
        this.undoStack.push(entry);
        this.notify();

        return true;

    }

    public canUndo(): boolean {

        return this.undoStack.length > 0;

    }

    public canRedo(): boolean {

        return this.redoStack.length > 0;

    }

    public addChangeListener(listener: () => void): void {

        this.listeners.add(listener);

    }

    private notify(): void {

        for (const listener of this.listeners) {
            listener();
        }

    }

}
