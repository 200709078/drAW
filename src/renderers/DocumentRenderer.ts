import { Document } from "../document/Document";
import { Stroke } from "../document/Stroke";
import { DrawingContext } from "../models/DrawingContext";
import { StrokeRenderer } from "./StrokeRenderer";

export class DocumentRenderer {

    private readonly drawingContext: DrawingContext;
    private readonly document: Document;
    private readonly strokeRenderer: StrokeRenderer;
    private selectedStroke: Stroke | null;

    constructor(
        drawingContext: DrawingContext,
        document: Document
    ) {

        this.drawingContext = drawingContext;
        this.document = document;

        this.strokeRenderer = new StrokeRenderer(
            drawingContext
        );
        this.selectedStroke = null;

    }

    public render(activeStroke: Stroke | null = null): void {

        this.drawingContext.clear();

        const page = this.document.getCurrentPage();

        for (const stroke of page.getStrokes()) {

            this.strokeRenderer.render(stroke);

        }

        if (activeStroke !== null) {
            this.strokeRenderer.render(activeStroke);
        }

        if (this.selectedStroke !== null) {
            this.strokeRenderer.renderSelection(this.selectedStroke);
        }

    }

    public setSelectedStroke(stroke: Stroke | null): void {

        this.selectedStroke = stroke;

    }

}
