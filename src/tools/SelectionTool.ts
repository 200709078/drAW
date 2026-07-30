import { Document } from "../document/Document";
import { Point } from "../document/Point";
import { Stroke } from "../document/Stroke";
import { DocumentImage } from "../document/DocumentImage";
import { DrawingContext } from "../models/DrawingContext";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { Tool } from "./Tool";
import { HistoryManager } from "../core/HistoryManager";

type SelectableObject = Stroke | DocumentImage;

export class SelectionTool extends Tool {

    private readonly document: Document;
    private readonly renderer: DocumentRenderer;
    private readonly history: HistoryManager;
    private readonly selectedStrokes: Set<Stroke>;
    private readonly selectedImages: Set<DocumentImage>;
    private isDragging: boolean;
    private isSelecting: boolean;
    private isAdditiveSelection: boolean;
    private startX: number;
    private startY: number;
    private lastX: number;
    private lastY: number;

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
        this.selectedStrokes = new Set();
        this.selectedImages = new Set();
        this.isDragging = false;
        this.isSelecting = false;
        this.isAdditiveSelection = false;
        this.startX = 0;
        this.startY = 0;
        this.lastX = 0;
        this.lastY = 0;

    }

    public override activate(): void {

        this.canvas.style.cursor = "move";

    }

    public override deactivate(): void {

        this.history.commit();
        this.clearSelection();

    }

    public override onPointerDown(event: PointerEvent): void {

        this.history.begin();
        const selectedObject = this.findObjectAt(event.offsetX, event.offsetY);

        this.startX = event.offsetX;
        this.startY = event.offsetY;
        this.lastX = event.offsetX;
        this.lastY = event.offsetY;
        this.isAdditiveSelection = event.shiftKey || event.ctrlKey || event.metaKey;
        this.isSelecting = selectedObject === null;
        this.isDragging = selectedObject !== null;

        if (selectedObject !== null) {
            if (this.isAdditiveSelection) {
                if (this.isObjectSelected(selectedObject)) {
                    this.removeObject(selectedObject);
                    this.isDragging = false;
                } else {
                    this.addObject(selectedObject);
                }
            } else if (!this.isObjectSelected(selectedObject)) {
                this.clearSelectedObjects();
                this.addObject(selectedObject);
            }
        } else if (!this.isAdditiveSelection) {
            this.clearSelectedObjects();
        }

        this.updateRendererSelection();

        if (this.isSelecting) {
            this.renderer.setSelectionBounds(this.startX, this.startY, this.startX, this.startY);
        }

        this.renderer.render();

    }

    public override onPointerMove(event: PointerEvent): void {

        if (this.isSelecting) {
            this.renderer.setSelectionBounds(this.startX, this.startY, event.offsetX, event.offsetY);
            this.renderer.render();

            return;
        }

        if (!this.isDragging) {
            return;
        }

        const deltaX = event.offsetX - this.lastX;
        const deltaY = event.offsetY - this.lastY;

        for (const stroke of this.selectedStrokes) {
            stroke.translate(deltaX, deltaY);
        }
        for (const image of this.selectedImages) {
            image.translate(deltaX, deltaY);
        }
        this.lastX = event.offsetX;
        this.lastY = event.offsetY;
        this.renderer.render();

    }

    public override onPointerUp(event: PointerEvent): void {

        if (this.isSelecting) {
            this.selectObjectsInBounds(event.offsetX, event.offsetY);
            this.renderer.clearSelectionBounds();
            this.updateRendererSelection();
            this.renderer.render();
        } else {
            this.onPointerMove(event);
        }

        this.isDragging = false;
        this.isSelecting = false;
        this.history.commit();

    }

    public override cancel(): void {

        this.isDragging = false;
        this.isSelecting = false;
        this.history.commit();
        this.clearSelection();

    }

    private clearSelection(): void {

        this.selectedStrokes.clear();
        this.selectedImages.clear();
        this.renderer.clearSelection();
        this.renderer.render();

    }

    private findObjectAt(x: number, y: number): SelectableObject | null {

        const strokes = this.document.getCurrentPage().getStrokes();

        for (let index = strokes.length - 1; index >= 0; index--) {
            const stroke = strokes[index];

            if (this.isStrokeHit(stroke, x, y)) {
                return stroke;
            }
        }

        const images = this.document.getCurrentPage().getImages();

        for (let index = images.length - 1; index >= 0; index--) {
            const image = images[index];

            if (this.isImageHit(image, x, y)) {
                return image;
            }
        }

        return null;

    }

    private selectObjectsInBounds(endX: number, endY: number): void {

        const minX = Math.min(this.startX, endX);
        const maxX = Math.max(this.startX, endX);
        const minY = Math.min(this.startY, endY);
        const maxY = Math.max(this.startY, endY);

        if (!this.isAdditiveSelection) {
            this.clearSelectedObjects();
        }

        for (const stroke of this.document.getCurrentPage().getStrokes()) {
            if (this.isStrokeInBounds(stroke, minX, minY, maxX, maxY)) {
                this.selectedStrokes.add(stroke);
            }
        }

        for (const image of this.document.getCurrentPage().getImages()) {
            if (this.isImageInBounds(image, minX, minY, maxX, maxY)) {
                this.selectedImages.add(image);
            }
        }

    }

    private isStrokeInBounds(
        stroke: Stroke,
        minX: number,
        minY: number,
        maxX: number,
        maxY: number
    ): boolean {

        const points = stroke.getPoints();

        if (points.length === 0) {
            return false;
        }

        let strokeMinX = Infinity;
        let strokeMaxX = -Infinity;
        let strokeMinY = Infinity;
        let strokeMaxY = -Infinity;

        for (const point of points) {
            strokeMinX = Math.min(strokeMinX, point.getX());
            strokeMaxX = Math.max(strokeMaxX, point.getX());
            strokeMinY = Math.min(strokeMinY, point.getY());
            strokeMaxY = Math.max(strokeMaxY, point.getY());
        }

        return strokeMaxX >= minX && strokeMinX <= maxX &&
            strokeMaxY >= minY && strokeMinY <= maxY;

    }

    private isImageInBounds(
        image: DocumentImage,
        minX: number,
        minY: number,
        maxX: number,
        maxY: number
    ): boolean {

        return image.getX() + image.getWidth() >= minX && image.getX() <= maxX &&
            image.getY() + image.getHeight() >= minY && image.getY() <= maxY;

    }

    private isImageHit(image: DocumentImage, x: number, y: number): boolean {

        return x >= image.getX() && x <= image.getX() + image.getWidth() &&
            y >= image.getY() && y <= image.getY() + image.getHeight();

    }

    private isObjectSelected(selectedObject: SelectableObject): boolean {

        return selectedObject instanceof Stroke ?
            this.selectedStrokes.has(selectedObject) : this.selectedImages.has(selectedObject);

    }

    private addObject(selectedObject: SelectableObject): void {

        if (selectedObject instanceof Stroke) {
            this.selectedStrokes.add(selectedObject);
        } else {
            this.selectedImages.add(selectedObject);
        }

    }

    private removeObject(selectedObject: SelectableObject): void {

        if (selectedObject instanceof Stroke) {
            this.selectedStrokes.delete(selectedObject);
        } else {
            this.selectedImages.delete(selectedObject);
        }

    }

    private clearSelectedObjects(): void {

        this.selectedStrokes.clear();
        this.selectedImages.clear();

    }

    private updateRendererSelection(): void {

        this.renderer.setSelectedStrokes([...this.selectedStrokes]);
        this.renderer.setSelectedImages([...this.selectedImages]);

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
