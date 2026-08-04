import { Document } from "../document/Document";
import { Point } from "../document/Point";
import { Stroke } from "../document/Stroke";
import { DrawingContext } from "../models/DrawingContext";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { Tool } from "./Tool";
import { HistoryManager } from "../core/HistoryManager";

export const ERASER_CURSOR = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='%23fda4af' stroke='%239e2940' stroke-width='1.5' stroke-linejoin='round' d='m5 27 4-12L20 4l8 8-11 11z'/%3E%3Cpath fill='%23f8fafc' stroke='%2394a3b8' stroke-width='1.5' stroke-linejoin='round' d='m5 27 4-12 8 8z'/%3E%3Cpath fill='%23fecdd3' d='m20 4 8 8-2.5 2.5-8-8z'/%3E%3C/svg%3E\") 5 27, cell";

export class EraserTool extends Tool {

    private readonly document: Document;
    private readonly renderer: DocumentRenderer;
    private readonly history: HistoryManager;
    private isErasing: boolean;
    private radius: number;

    constructor(
        drawingContext: DrawingContext,
        document: Document,
        renderer: DocumentRenderer,
        history: HistoryManager
    ) {

        super(drawingContext);

        this.document = document;
        this.renderer = renderer;
        this.history = history;
        this.isErasing = false;
        this.radius = 12;

    }

    public override activate(): void {

        this.canvas.style.cursor = ERASER_CURSOR;

    }

    public override deactivate(): void {

        this.isErasing = false;
        this.history.commit();

    }

    public override onPointerDown(event: PointerEvent): void {

        this.history.begin();
        this.isErasing = true;
        this.eraseAt(event.offsetX, event.offsetY);

    }

    public override onPointerMove(event: PointerEvent): void {

        if (this.isErasing) {
            this.eraseAt(event.offsetX, event.offsetY);
        }

    }

    public override onPointerUp(event: PointerEvent): void {

        this.eraseAt(event.offsetX, event.offsetY);
        this.isErasing = false;
        this.history.commit();

    }

    public override cancel(): void {

        this.isErasing = false;
        this.history.commit();

    }

    public setLineWidth(lineWidth: number): void {

        if (Number.isFinite(lineWidth) && lineWidth > 0) {
            this.radius = Math.max(4, lineWidth * 2);
        }

    }

    private eraseAt(x: number, y: number): void {

        const page = this.document.getCurrentPage();
        let hasChanged = false;

        for (const stroke of page.getStrokes().filter((stroke) => {
            return this.isStrokeHit(stroke, x, y);
        })) {
            page.removeStroke(stroke);
            hasChanged = true;
        }

        for (const image of [...page.getImages()]) {
            if (image.hitTest(x, y, this.radius)) {
                page.removeImage(image);
                hasChanged = true;
            }
        }

        if (hasChanged) {
            this.renderer.render();
        }

    }

    private isStrokeHit(stroke: Stroke, x: number, y: number): boolean {

        const points = stroke.getPoints();

        if (points.length === 0) {
            return false;
        }

        if (points.length === 1) {
            return this.getDistance(points[0].getX(), points[0].getY(), x, y) <= (
                this.radius + this.getLineWidth(stroke, points[0]) / 2
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

            if (distance <= this.radius + lineWidth / 2) {
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
