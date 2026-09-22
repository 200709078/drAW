import { DrawingContext } from "../models/DrawingContext";

export abstract class Tool {

    protected readonly drawingContext: DrawingContext;

    constructor(
        drawingContext: DrawingContext
    ) {

        this.drawingContext = drawingContext;

    }

    protected get canvas(): HTMLCanvasElement {

        return this.drawingContext.getCanvas();

    }

    protected get context(): CanvasRenderingContext2D {

        return this.drawingContext.getContext();

    }

    protected get width(): number {

        return this.drawingContext.getWidth();

    }

    protected get height(): number {

        return this.drawingContext.getHeight();

    }

    protected worldX(event: { offsetX: number; offsetY: number }): number {

        return this.drawingContext.getViewport().screenToWorldX(event.offsetX);

    }

    protected worldY(event: { offsetX: number; offsetY: number }): number {

        return this.drawingContext.getViewport().screenToWorldY(event.offsetY);

    }

    public activate(): void {

    }

    public deactivate(): void {

    }

    public abstract onPointerDown(event: PointerEvent): void;

    public abstract onPointerMove(event: PointerEvent): void;

    public abstract onPointerUp(event: PointerEvent): void;

    public onPointerCancel(event: PointerEvent): void {

        void event;
        this.cancel();

    }

    // Pinch gibi çok parmaklı harekete geçilirken sürmekte olan
    // hareketi bitirir. Varsayılan davranış cancel ile aynıdır.
    public interruptGesture(): void {

        this.cancel();

    }

    public cancel(): void {

    }

}