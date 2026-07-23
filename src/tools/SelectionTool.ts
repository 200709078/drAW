import { Document } from "../document/Document";
import { Point } from "../document/Point";
import { Stroke } from "../document/Stroke";
import { DrawingContext } from "../models/DrawingContext";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { Tool } from "./Tool";

export class SelectionTool extends Tool {

    private readonly document: Document;
    private readonly renderer: DocumentRenderer;
    private selectedStroke: Stroke | null;
    private isDragging: boolean;
    private lastX: number;
    private lastY: number;

    constructor(
        drawingContext: DrawingContext,
        document: Document,
        renderer: DocumentRenderer
    ) {

        super(drawingContext);

        this.document = document;
        this.renderer = renderer;
        this.selectedStroke = null;
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;

    }

    public override activate(): void {

        this.canvas.style.cursor = "move";

    }

    public override deactivate(): void {

        this.clearSelection();

    }

    public override onPointerDown(event: PointerEvent): void {

        this.selectedStroke = this.findStrokeAt(event.offsetX, event.offsetY);
        this.isDragging = this.selectedStroke !== null;
        this.lastX = event.offsetX;
        this.lastY = event.offsetY;
        this.renderer.setSelectedStroke(this.selectedStroke);
        this.renderer.render();

    }

    public override onPointerMove(event: PointerEvent): void {

        if (!this.isDragging || this.selectedStroke === null) {
            return;
        }

        const deltaX = event.offsetX - this.lastX;
        const deltaY = event.offsetY - this.lastY;

        this.selectedStroke.translate(deltaX, deltaY);
        this.lastX = event.offsetX;
        this.lastY = event.offsetY;
        this.renderer.render();

    }

    public override onPointerUp(event: PointerEvent): void {

        this.onPointerMove(event);
        this.isDragging = false;

    }

    public override cancel(): void {

        this.isDragging = false;
        this.clearSelection();

    }

    private clearSelection(): void {

        this.selectedStroke = null;
        this.renderer.setSelectedStroke(null);
        this.renderer.render();

    }

    private findStrokeAt(x: number, y: number): Stroke | null {

        const strokes = this.document.getCurrentPage().getStrokes();

        for (let index = strokes.length - 1; index >= 0; index--) {
            const stroke = strokes[index];

            if (this.isStrokeHit(stroke, x, y)) {
                return stroke;
            }
        }

        return null;

    }

    private isStrokeHit(stroke: Stroke, x: number, y: number): boolean {

        const points = stroke.getPoints();

        if (points.length === 0) {
            return false;
        }

        if (points.length === 1) {
            return this.getDistance(points[0].getX(), points[0].getY(), x, y) <= (
                this.getLineWidth(stroke, points[0]) / 2 + 6
            );
        }

        for (let index = 1; index < points.length; index++) {
            const startPoint = points[index - 1];
            const endPoint = points[index];
            const distance = this.getDistanceToSegment(
                x,
                y,
                startPoint.getX(),
                startPoint.getY(),
                endPoint.getX(),
                endPoint.getY()
            );
            const lineWidth = (
                this.getLineWidth(stroke, startPoint) +
                this.getLineWidth(stroke, endPoint)
            ) / 2;

            if (distance <= lineWidth / 2 + 6) {
                return true;
            }
        }

        return false;

    }

    private getDistanceToSegment(
        x: number,
        y: number,
        startX: number,
        startY: number,
        endX: number,
        endY: number
    ): number {

        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const lengthSquared = deltaX * deltaX + deltaY * deltaY;

        if (lengthSquared === 0) {
            return this.getDistance(x, y, startX, startY);
        }

        const projection = Math.max(0, Math.min(1, (
            (x - startX) * deltaX + (y - startY) * deltaY
        ) / lengthSquared));
        const closestX = startX + projection * deltaX;
        const closestY = startY + projection * deltaY;

        return this.getDistance(x, y, closestX, closestY);

    }

    private getDistance(firstX: number, firstY: number, secondX: number, secondY: number): number {

        return Math.hypot(firstX - secondX, firstY - secondY);

    }

    private getLineWidth(stroke: Stroke, point: Point): number {

        const pressure = Math.min(1, Math.max(0.1, point.getPressure()));

        return Math.max(0.5, stroke.getLineWidth() * pressure);

    }

}
