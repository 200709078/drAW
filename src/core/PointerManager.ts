import { ToolManager } from "./ToolManager";
import { ViewportManager } from "./ViewportManager";

export class PointerManager {

    private static readonly WHEEL_ZOOM_IN_FACTOR = 1.15;
    private static readonly WHEEL_ZOOM_OUT_FACTOR = 1 / 1.15;

    private canvas: HTMLCanvasElement;
    private toolManager: ToolManager;
    private viewport: ViewportManager;
    private readonly activePointers: Map<number, { x: number; y: number }>;
    private pinching: boolean;
    private pinchDistance: number;
    private pinchMidX: number;
    private pinchMidY: number;
    private panPointerId: number | null;
    private panLastX: number;
    private panLastY: number;
    private panCursor: string;

    constructor(
        canvas: HTMLCanvasElement,
        toolManager: ToolManager,
        viewport: ViewportManager
    ) {

        this.canvas = canvas;
        this.toolManager = toolManager;
        this.viewport = viewport;
        this.activePointers = new Map();
        this.pinching = false;
        this.pinchDistance = 0;
        this.pinchMidX = 0;
        this.pinchMidY = 0;
        this.panPointerId = null;
        this.panLastX = 0;
        this.panLastY = 0;
        this.panCursor = "";

        this.attachEvents();

    }

    private attachEvents(): void {

        this.canvas.addEventListener("pointerdown", this.onPointerDown);
        this.canvas.addEventListener("pointermove", this.onPointerMove);
        this.canvas.addEventListener("pointerup", this.onPointerUp);
        this.canvas.addEventListener("pointercancel", this.onPointerCancel);
        this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
        // Orta tuş otomatik kaydırmayı engelle.
        this.canvas.addEventListener("mousedown", this.onMouseDown);

    }

    private onMouseDown = (event: MouseEvent): void => {

        if (event.button === 1) {
            event.preventDefault();
        }

    };

    private onPointerDown = (event: PointerEvent): void => {

        const tool = this.toolManager.getActiveTool();

        if (!tool) {
            return;
        }

        // Orta tuşla sürükleyerek kaydırma.
        if (event.button === 1 && event.pointerType === "mouse") {
            event.preventDefault();
            this.stopPan();

            if (!this.pinching) {
                this.panPointerId = event.pointerId;
                this.panLastX = event.offsetX;
                this.panLastY = event.offsetY;
                this.panCursor = this.canvas.style.cursor;
                this.canvas.style.cursor = "grabbing";
            }

            return;
        }

        if (this.panPointerId !== null) {
            this.stopPan();
        }

        this.canvas.setPointerCapture(event.pointerId);
        this.activePointers.set(event.pointerId, { x: event.offsetX, y: event.offsetY });

        if (this.activePointers.size === 2) {
            this.beginPinch(tool);
            return;
        }

        if (this.pinching) {
            return;
        }

        tool.onPointerDown(event);

    };

    private onPointerMove = (event: PointerEvent): void => {

        if (this.panPointerId !== null) {
            if (event.pointerId === this.panPointerId) {
                this.viewport.panBy(event.offsetX - this.panLastX, event.offsetY - this.panLastY);
                this.panLastX = event.offsetX;
                this.panLastY = event.offsetY;
            }

            return;
        }

        if (this.pinching) {
            this.updatePinch(event);
            return;
        }

        if (!this.activePointers.has(event.pointerId)) {
            return;
        }

        this.activePointers.set(event.pointerId, { x: event.offsetX, y: event.offsetY });
        this.toolManager.getActiveTool()?.onPointerMove(event);

    };

    private onPointerUp = (event: PointerEvent): void => {

        if (event.pointerId === this.panPointerId) {
            this.stopPan();
            this.releasePointerCapture(event.pointerId);
            return;
        }

        this.activePointers.delete(event.pointerId);
        this.releasePointerCapture(event.pointerId);

        if (this.pinching) {
            if (this.activePointers.size < 2) {
                this.pinching = false;
            }

            return;
        }

        this.toolManager.getActiveTool()?.onPointerUp(event);

    };

    private onPointerCancel = (event: PointerEvent): void => {

        if (event.pointerId === this.panPointerId) {
            this.stopPan();
            this.releasePointerCapture(event.pointerId);
            return;
        }

        this.activePointers.delete(event.pointerId);
        this.releasePointerCapture(event.pointerId);

        if (this.pinching) {
            if (this.activePointers.size < 2) {
                this.pinching = false;
            }

            return;
        }

        this.toolManager.getActiveTool()?.onPointerCancel(event);

    };

    private onWheel = (event: WheelEvent): void => {

        if (!event.ctrlKey) {
            return;
        }

        event.preventDefault();
        this.viewport.zoomAt(
            event.offsetX,
            event.offsetY,
            event.deltaY < 0
                ? PointerManager.WHEEL_ZOOM_IN_FACTOR
                : PointerManager.WHEEL_ZOOM_OUT_FACTOR
        );

    };

    private beginPinch(tool: { interruptGesture: () => void }): void {

        tool.interruptGesture();

        const points = [...this.activePointers.values()];
        this.pinchDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        this.pinchMidX = (points[0].x + points[1].x) / 2;
        this.pinchMidY = (points[0].y + points[1].y) / 2;
        this.pinching = true;

    }

    private updatePinch(event: PointerEvent): void {

        if (!this.activePointers.has(event.pointerId)) {
            return;
        }

        this.activePointers.set(event.pointerId, { x: event.offsetX, y: event.offsetY });

        if (this.activePointers.size < 2) {
            this.pinching = false;
            return;
        }

        const points = [...this.activePointers.values()];
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        const midX = (points[0].x + points[1].x) / 2;
        const midY = (points[0].y + points[1].y) / 2;

        // Önce parmakların ortak hareketi (kaydırma), sonra açıklık (zoom).
        this.viewport.panBy(midX - this.pinchMidX, midY - this.pinchMidY);

        if (this.pinchDistance > 0 && distance > 0) {
            this.viewport.zoomAt(midX, midY, distance / this.pinchDistance);
        }

        this.pinchDistance = distance;
        this.pinchMidX = midX;
        this.pinchMidY = midY;

    }

    private stopPan(): void {

        if (this.panPointerId === null) {
            return;
        }

        this.panPointerId = null;
        this.canvas.style.cursor = this.panCursor;

    }

    private releasePointerCapture(pointerId: number): void {

        if (this.canvas.hasPointerCapture(pointerId)) {
            this.canvas.releasePointerCapture(pointerId);
        }

    }

}
