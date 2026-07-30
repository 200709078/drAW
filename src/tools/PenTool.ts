import { Tool } from "./Tool";
import { DrawingContext } from "../models/DrawingContext";

import { Document } from "../document/Document";
import { Stroke } from "../document/Stroke";
import { Point } from "../document/Point";

import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { HistoryManager } from "../core/HistoryManager";

export class PenTool extends Tool {

    private static readonly CURSOR = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='%23111827' d='m5 27 3-8L23 4l5 5-15 15z'/%3E%3Cpath fill='%23fff' d='m21.6 5.4 5 5-1.7 1.7-5-5z'/%3E%3Cpath fill='%232563eb' d='m5 27 3-8 5 5z'/%3E%3C/svg%3E\") 5 27, crosshair";

    private readonly document: Document;
    private readonly renderer: DocumentRenderer;
    private readonly history: HistoryManager;

    private currentStroke: Stroke | null;
    private color: string;
    private lineWidth: number;
    private readonly opacity: number;
    private readonly lineWidthMultiplier: number;

    constructor(
        drawingContext: DrawingContext,
        document: Document,
        renderer: DocumentRenderer,
        history: HistoryManager,
        opacity: number = 1,
        lineWidthMultiplier: number = 1
    ) {

        super(drawingContext);

        this.document = document;
        this.renderer = renderer;
        this.history = history;

        this.currentStroke = null;
        this.color = "#111827";
        this.lineWidth = 6;
        this.opacity = opacity;
        this.lineWidthMultiplier = lineWidthMultiplier;

    }

    public override activate(): void {

        this.canvas.style.cursor = PenTool.CURSOR;

    }

    public override deactivate(): void {

        this.currentStroke = null;
        this.history.discard();

    }

    public override onPointerDown(event: PointerEvent): void {

        this.history.begin();

        this.currentStroke = new Stroke(
            this.color,
            this.lineWidth * this.lineWidthMultiplier,
            this.opacity
        );

        this.currentStroke.addPoint(
            new Point(
                event.offsetX,
                event.offsetY,
                this.getPressure(event)
            )
        );

    }

    public override onPointerMove(event: PointerEvent): void {

        if (this.currentStroke === null) {
            return;
        }

        this.currentStroke.addPoint(
            new Point(
                event.offsetX,
                event.offsetY,
                this.getPressure(event)
            )
        );

        this.renderer.render(this.currentStroke);

    }

    public override onPointerUp(event: PointerEvent): void {

        if (this.currentStroke === null) {
            return;
        }

        this.currentStroke.addPoint(
            new Point(
                event.offsetX,
                event.offsetY,
                this.getPressure(event)
            )
        );

        this.document
            .getCurrentPage()
            .addStroke(this.currentStroke);

        this.currentStroke = null;

        this.history.commit();

        this.renderer.render();

    }

    public override cancel(): void {

        this.currentStroke = null;
        this.history.discard();
        this.renderer.render();

    }

    public setColor(color: string): void {

        this.color = color;

    }

    public setLineWidth(lineWidth: number): void {

        if (Number.isFinite(lineWidth) && lineWidth > 0) {
            this.lineWidth = lineWidth;
        }

    }

    private getPressure(event: PointerEvent): number {

        return event.pointerType === "mouse" ? 1 : event.pressure;

    }

}
