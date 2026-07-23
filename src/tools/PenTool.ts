import { Tool } from "./Tool";
import { DrawingContext } from "../models/DrawingContext";

import { Document } from "../document/Document";
import { Stroke } from "../document/Stroke";
import { Point } from "../document/Point";

import { DocumentRenderer } from "../renderers/DocumentRenderer";

export class PenTool extends Tool {

    private readonly document: Document;
    private readonly renderer: DocumentRenderer;

    private currentStroke: Stroke | null;
    private color: string;
    private lineWidth: number;
    private readonly opacity: number;
    private readonly lineWidthMultiplier: number;

    constructor(
        drawingContext: DrawingContext,
        document: Document,
        renderer: DocumentRenderer,
        opacity: number = 1,
        lineWidthMultiplier: number = 1
    ) {

        super(drawingContext);

        this.document = document;
        this.renderer = renderer;

        this.currentStroke = null;
        this.color = "#111827";
        this.lineWidth = 6;
        this.opacity = opacity;
        this.lineWidthMultiplier = lineWidthMultiplier;

    }

    public override activate(): void {

        this.canvas.style.cursor = "crosshair";

    }

    public override deactivate(): void {

        this.currentStroke = null;

    }

    public override onPointerDown(event: PointerEvent): void {

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

        this.renderer.render();

    }

    public override cancel(): void {

        this.currentStroke = null;
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
