import { Document } from "../document/Document";
import { DrawingContext } from "../models/DrawingContext";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { PenTool } from "./PenTool";

export class HighlighterTool extends PenTool {

    constructor(
        drawingContext: DrawingContext,
        document: Document,
        renderer: DocumentRenderer
    ) {

        super(drawingContext, document, renderer, 0.35, 3);

    }

    public override activate(): void {

        this.canvas.style.cursor = "copy";

    }

}
