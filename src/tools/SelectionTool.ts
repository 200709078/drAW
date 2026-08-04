import { Document } from "../document/Document";
import { Point } from "../document/Point";
import { Stroke } from "../document/Stroke";
import { DocumentImage } from "../document/DocumentImage";
import { DrawingContext } from "../models/DrawingContext";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { Tool } from "./Tool";
import { HistoryManager } from "../core/HistoryManager";
import {
    ALL_RESIZE_HANDLES,
    getResizeCursor,
    getResizeHandlePosition,
    type ResizeHandle,
    type SelectionBounds
} from "../renderers/ResizeHandle";

type SelectableObject = Stroke | DocumentImage;
type CornerHandle = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";
type EdgeHandle = "top" | "right" | "bottom" | "left";

type ResizeOriginals = {
    strokes: Point[][];
    images: Array<{ x: number; y: number; width: number; height: number }>;
};

export class SelectionTool extends Tool {

    private readonly document: Document;
    private readonly renderer: DocumentRenderer;
    private readonly history: HistoryManager;
    private readonly selectedStrokes: Set<Stroke>;
    private readonly selectedImages: Set<DocumentImage>;
    private isDragging: boolean;
    private isSelecting: boolean;
    private isAdditiveSelection: boolean;
    private isResizing: boolean;
    private activeHandle: ResizeHandle | null;
    private resizeBounds: SelectionBounds | null;
    private resizeOriginals: ResizeOriginals | null;
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
        this.isResizing = false;
        this.activeHandle = null;
        this.resizeBounds = null;
        this.resizeOriginals = null;
        this.startX = 0;
        this.startY = 0;
        this.lastX = 0;
        this.lastY = 0;

    }

    public override activate(): void {

        this.canvas.style.cursor = "default";
        this.canvas.addEventListener("mousemove", this.handleHover);
        window.addEventListener("keydown", this.handleKeyDown);

    }

    public override deactivate(): void {

        this.canvas.removeEventListener("mousemove", this.handleHover);
        window.removeEventListener("keydown", this.handleKeyDown);
        this.canvas.style.cursor = "";
        this.history.commit();
        this.clearSelection();

    }

    private readonly handleKeyDown = (event: KeyboardEvent): void => {

        if (event.key !== "Delete" && event.key !== "Backspace") {
            return;
        }

        const target = event.target as HTMLElement | null;

        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            return;
        }

        event.preventDefault();
        this.deleteSelection();

    };

    public deleteSelection(): void {

        if (this.selectedStrokes.size === 0 && this.selectedImages.size === 0) {
            return;
        }

        const page = this.document.getCurrentPage();

        this.history.begin();

        for (const stroke of this.selectedStrokes) {
            page.removeStroke(stroke);
        }
        for (const image of this.selectedImages) {
            page.removeImage(image);
        }

        this.history.commit();
        this.clearSelection();

    }

    private readonly handleHover = (event: MouseEvent): void => {

        if (this.isResizing) {
            this.canvas.style.cursor = this.activeHandle !== null ?
                getResizeCursor(this.activeHandle) : "move";

            return;
        }

        if (this.isDragging || this.isSelecting) {
            this.canvas.style.cursor = "move";

            return;
        }

        const handle = this.getHandleAt(event.offsetX, event.offsetY);

        if (handle !== null) {
            this.canvas.style.cursor = getResizeCursor(handle);

            return;
        }

        this.canvas.style.cursor = this.findObjectAt(event.offsetX, event.offsetY) !== null ? "move" : "default";

    };

    public override onPointerDown(event: PointerEvent): void {

        this.history.begin();

        this.startX = event.offsetX;
        this.startY = event.offsetY;
        this.lastX = event.offsetX;
        this.lastY = event.offsetY;
        this.isAdditiveSelection = event.shiftKey || event.ctrlKey || event.metaKey;

        const handle = this.getHandleAt(this.startX, this.startY);

        if (handle !== null && !this.isAdditiveSelection) {
            this.startResize(handle);
            this.renderer.render();

            return;
        }

        const selectedObject = this.findObjectAt(event.offsetX, event.offsetY);

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

        if (this.isResizing) {
            this.applyResize(event.offsetX, event.offsetY);

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

        if (this.isResizing) {
            this.isResizing = false;
            this.activeHandle = null;
            this.resizeBounds = null;
            this.resizeOriginals = null;
            this.history.commit();

            return;
        }

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
        this.isResizing = false;
        this.activeHandle = null;
        this.resizeBounds = null;
        this.resizeOriginals = null;
        this.history.commit();
        this.clearSelection();

    }

    private clearSelection(): void {

        this.selectedStrokes.clear();
        this.selectedImages.clear();
        this.renderer.clearSelection();
        this.renderer.render();

    }

    private getHandleAt(x: number, y: number): ResizeHandle | null {

        const bounds = this.renderer.getSelectionBounds();

        if (bounds === null) {
            return null;
        }

        const hitRadius = 10;

        for (const handle of ALL_RESIZE_HANDLES) {
            const position = getResizeHandlePosition(handle, bounds);

            if (Math.hypot(x - position.x, y - position.y) <= hitRadius) {
                return handle;
            }
        }

        return null;

    }

    private startResize(handle: ResizeHandle): void {

        const bounds = this.renderer.getSelectionBounds();

        if (bounds === null) {
            return;
        }

        this.isResizing = true;
        this.activeHandle = handle;
        this.resizeBounds = bounds;
        this.resizeOriginals = this.captureResizeOriginals();

    }

    private captureResizeOriginals(): ResizeOriginals {

        return {
            strokes: [...this.selectedStrokes].map((stroke) => {
                return stroke.getPoints().map((point) => new Point(
                    point.getX(),
                    point.getY(),
                    point.getPressure(),
                    point.getTimestamp()
                ));
            }),
            images: [...this.selectedImages].map((image) => ({
                x: image.getX(),
                y: image.getY(),
                width: image.getWidth(),
                height: image.getHeight()
            }))
        };

    }

    private applyResize(pointerX: number, pointerY: number): void {

        if (this.activeHandle === null || this.resizeBounds === null || this.resizeOriginals === null) {
            return;
        }

        const { scaleX, scaleY, offsetX, offsetY } = this.computeResizeTransform(
            this.activeHandle,
            this.resizeBounds,
            pointerX,
            pointerY
        );

        let strokeIndex = 0;

        for (const stroke of this.selectedStrokes) {
            const originalPoints = this.resizeOriginals.strokes[strokeIndex];

            stroke.setPoints(originalPoints.map((point) => new Point(
                point.getX() * scaleX + offsetX,
                point.getY() * scaleY + offsetY,
                point.getPressure(),
                point.getTimestamp()
            )));
            strokeIndex++;
        }

        let imageIndex = 0;

        for (const image of this.selectedImages) {
            const original = this.resizeOriginals.images[imageIndex];

            image.setGeometry(
                original.x * scaleX + offsetX,
                original.y * scaleY + offsetY,
                original.width * scaleX,
                original.height * scaleY
            );
            imageIndex++;
        }

        this.renderer.render();

    }

    private computeResizeTransform(
        handle: ResizeHandle,
        bounds: SelectionBounds,
        pointerX: number,
        pointerY: number
    ): { scaleX: number; scaleY: number; offsetX: number; offsetY: number } {

        if (handle === "topLeft" || handle === "topRight" ||
            handle === "bottomRight" || handle === "bottomLeft") {
            return this.computeCornerTransform(handle, bounds, pointerX, pointerY);
        }

        return this.computeEdgeTransform(handle, bounds, pointerX, pointerY);

    }

    private computeCornerTransform(
        handle: CornerHandle,
        bounds: SelectionBounds,
        pointerX: number,
        pointerY: number
    ): { scaleX: number; scaleY: number; offsetX: number; offsetY: number } {

        let anchorX: number;
        let anchorY: number;
        let handleX: number;
        let handleY: number;

        switch (handle) {
            case "topLeft":
                anchorX = bounds.maxX;
                anchorY = bounds.maxY;
                handleX = bounds.minX;
                handleY = bounds.minY;
                break;
            case "topRight":
                anchorX = bounds.minX;
                anchorY = bounds.maxY;
                handleX = bounds.maxX;
                handleY = bounds.minY;
                break;
            case "bottomRight":
                anchorX = bounds.minX;
                anchorY = bounds.minY;
                handleX = bounds.maxX;
                handleY = bounds.maxY;
                break;
            case "bottomLeft":
                anchorX = bounds.maxX;
                anchorY = bounds.minY;
                handleX = bounds.minX;
                handleY = bounds.maxY;
                break;
        }

        const scaleX = handleX === anchorX ? 1 : (pointerX - anchorX) / (handleX - anchorX);
        const scaleY = handleY === anchorY ? 1 : (pointerY - anchorY) / (handleY - anchorY);
        const rawScale = Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY;
        const scale = Math.max(0.01, Math.min(rawScale, 100));

        return {
            scaleX: scale,
            scaleY: scale,
            offsetX: anchorX - anchorX * scale,
            offsetY: anchorY - anchorY * scale
        };

    }

    private computeEdgeTransform(
        handle: EdgeHandle,
        bounds: SelectionBounds,
        pointerX: number,
        pointerY: number
    ): { scaleX: number; scaleY: number; offsetX: number; offsetY: number } {

        const clampScale = (value: number): number => Math.max(0.01, Math.min(value, 100));

        switch (handle) {
            case "top": {
                const scaleY = clampScale((pointerY - bounds.maxY) / (bounds.minY - bounds.maxY));

                return {
                    scaleX: 1,
                    scaleY,
                    offsetX: 0,
                    offsetY: bounds.maxY - bounds.maxY * scaleY
                };
            }
            case "bottom": {
                const scaleY = clampScale((pointerY - bounds.minY) / (bounds.maxY - bounds.minY));

                return {
                    scaleX: 1,
                    scaleY,
                    offsetX: 0,
                    offsetY: bounds.minY - bounds.minY * scaleY
                };
            }
            case "left": {
                const scaleX = clampScale((pointerX - bounds.maxX) / (bounds.minX - bounds.maxX));

                return {
                    scaleX,
                    scaleY: 1,
                    offsetX: bounds.maxX - bounds.maxX * scaleX,
                    offsetY: 0
                };
            }
            case "right": {
                const scaleX = clampScale((pointerX - bounds.minX) / (bounds.maxX - bounds.minX));

                return {
                    scaleX,
                    scaleY: 1,
                    offsetX: bounds.minX - bounds.minX * scaleX,
                    offsetY: 0
                };
            }
        }

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
