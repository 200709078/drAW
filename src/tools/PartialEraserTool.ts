import { Document } from "../document/Document";
import { Point } from "../document/Point";
import { Stroke } from "../document/Stroke";
import { DrawingContext } from "../models/DrawingContext";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { Tool } from "./Tool";

export class PartialEraserTool extends Tool {

    private static readonly RADIUS = 12;

    private readonly document: Document;
    private readonly renderer: DocumentRenderer;
    private isErasing: boolean;

    constructor(
        drawingContext: DrawingContext,
        document: Document,
        renderer: DocumentRenderer
    ) {

        super(drawingContext);

        this.document = document;
        this.renderer = renderer;
        this.isErasing = false;

    }

    public override activate(): void {

        this.canvas.style.cursor = "cell";

    }

    public override deactivate(): void {

        this.isErasing = false;

    }

    public override onPointerDown(event: PointerEvent): void {

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

    }

    public override cancel(): void {

        this.isErasing = false;

    }

    private eraseAt(x: number, y: number): void {

        const page = this.document.getCurrentPage();
        let hasChanged = false;

        for (const stroke of [...page.getStrokes()]) {
            const fragments = this.createFragments(stroke, x, y);

            if (fragments === null) {
                continue;
            }

            page.replaceStroke(stroke, fragments);
            hasChanged = true;
        }

        if (hasChanged) {
            this.renderer.render();
        }

    }

    private createFragments(stroke: Stroke, x: number, y: number): Stroke[] | null {

        const points = stroke.getPoints();

        if (points.length === 0) {
            return null;
        }

        if (points.length === 1) {
            return this.isPointHit(stroke, points[0], x, y) ? [] : null;
        }

        const fragments: Stroke[] = [];
        let fragment: Stroke | null = null;
        let hasErasedSegment = false;

        for (let index = 1; index < points.length; index++) {
            const startPoint = points[index - 1];
            const endPoint = points[index];

            if (this.isSegmentHit(stroke, startPoint, endPoint, x, y)) {
                hasErasedSegment = true;

                if (fragment !== null) {
                    fragments.push(fragment);
                    fragment = null;
                }

                continue;
            }

            if (fragment === null) {
                fragment = this.createStroke(stroke);
                fragment.addPoint(startPoint);
            }

            fragment.addPoint(endPoint);
        }

        if (fragment !== null) {
            fragments.push(fragment);
        }

        return hasErasedSegment ? fragments : null;

    }

    private createStroke(stroke: Stroke): Stroke {

        return new Stroke(
            stroke.getColor(),
            stroke.getLineWidth(),
            stroke.getOpacity()
        );

    }

    private isPointHit(stroke: Stroke, point: Point, x: number, y: number): boolean {

        return this.getDistance(point.getX(), point.getY(), x, y) <= (
            PartialEraserTool.RADIUS + this.getLineWidth(stroke, point) / 2
        );

    }

    private isSegmentHit(
        stroke: Stroke,
        startPoint: Point,
        endPoint: Point,
        x: number,
        y: number
    ): boolean {

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

        return distance <= PartialEraserTool.RADIUS + lineWidth / 2;

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
