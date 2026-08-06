import { Document } from "../document/Document";
import { TextObject } from "../document/TextObject";
import { DrawingContext } from "../models/DrawingContext";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { HistoryManager } from "../core/HistoryManager";
import { ToolManager } from "../core/ToolManager";
import { Tool } from "./Tool";
import { PenTool } from "./PenTool";
import { SelectionTool } from "./SelectionTool";
import { openTextEditor, closeTextEditor } from "../ui/TextEditor";

export function fontSizeFromLineWidth(lineWidth: number): number {

    return 8 + lineWidth * 4;

}

export class TextTool extends Tool {

    private readonly document: Document;
    private readonly renderer: DocumentRenderer;
    private readonly history: HistoryManager;
    private readonly toolManager: ToolManager;
    private readonly penTool: PenTool;
    private readonly selectionTool: SelectionTool;
    private editing: boolean;
    private isDeactivating: boolean;

    constructor(
        drawingContext: DrawingContext,
        document: Document,
        renderer: DocumentRenderer,
        history: HistoryManager,
        toolManager: ToolManager,
        penTool: PenTool,
        selectionTool: SelectionTool
    ) {

        super(drawingContext);

        this.document = document;
        this.renderer = renderer;
        this.history = history;
        this.toolManager = toolManager;
        this.penTool = penTool;
        this.selectionTool = selectionTool;
        this.editing = false;
        this.isDeactivating = false;

    }

    public override activate(): void {

        this.canvas.style.cursor = "text";

    }

    public override deactivate(): void {

        if (this.editing) {
            this.isDeactivating = true;
            closeTextEditor();
            this.isDeactivating = false;
            this.editing = false;
        }

    }

    public override onPointerDown(event: PointerEvent): void {

        if (this.editing) {
            return;
        }

        this.history.begin();

        const textObject = new TextObject(
            "Metin Giriniz",
            event.offsetX,
            event.offsetY,
            this.penTool.getColor(),
            fontSizeFromLineWidth(this.penTool.getLineWidth()),
            1
        );

        this.document.getCurrentPage().addText(textObject);
        this.renderer.render();

        this.editing = true;
        openTextEditor(textObject, (value) => {
            this.editing = false;

            const kept = this.finalizeNewText(textObject, value);

            if (!this.isDeactivating) {
                this.toolManager.setTool(this.selectionTool);

                if (kept) {
                    this.selectionTool.selectText(textObject);
                }
            }
        });

    }

    public override onPointerMove(): void {

    }

    public override onPointerUp(): void {

    }

    public override cancel(): void {

        if (this.editing) {
            closeTextEditor();
            this.editing = false;
        }

    }

    private finalizeNewText(textObject: TextObject, value: string): boolean {

        const page = this.document.getCurrentPage();

        if (value.trim() === "") {
            page.removeText(textObject);
            this.history.discard();

            return false;
        }

        textObject.setText(value);
        this.history.commit();

        return true;

    }

}
