import { Document } from "../document/Document";
import { DrawingContext } from "../models/DrawingContext";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { PenTool } from "./PenTool";
import { HistoryManager } from "../core/HistoryManager";

export class HighlighterTool extends PenTool {

    private static readonly HIGHLIGHTER_CURSOR = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='%23facc15' stroke='%23854709' stroke-width='1.5' stroke-linejoin='round' d='m4 28 3-10L21 4l7 7L14 25z'/%3E%3Cpath fill='%23fff7cc' d='m20.8 4.2 7 7-2.2 2.2-7-7z'/%3E%3Cpath fill='%23854709' d='m4 28 3-10 7 7z'/%3E%3C/svg%3E\") 4 28, copy";

    constructor(
        drawingContext: DrawingContext,
        document: Document,
        renderer: DocumentRenderer,
        history: HistoryManager
    ) {

        super(drawingContext, document, renderer, history, 0.35, 3);

    }

    public override activate(): void {

        this.canvas.style.cursor = HighlighterTool.HIGHLIGHTER_CURSOR;

    }

}
