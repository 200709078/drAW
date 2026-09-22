import { ViewportManager } from "../core/ViewportManager";

export class DrawingContext {

    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly viewport: ViewportManager;

    constructor(
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D
    ) {

        this.canvas = canvas;
        this.context = context;
        this.viewport = new ViewportManager();

    }

    public getCanvas(): HTMLCanvasElement {

        return this.canvas;

    }

    public getContext(): CanvasRenderingContext2D {

        return this.context;

    }

    public getViewport(): ViewportManager {

        return this.viewport;

    }

    public getWidth(): number {

        return this.canvas.width;

    }

    public getHeight(): number {

        return this.canvas.height;

    }

    public getCssWidth(): number {

        return this.canvas.clientWidth;

    }

    public getCssHeight(): number {

        return this.canvas.clientHeight;

    }

    public clear(): void {

        this.context.save();
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );
        this.context.restore();

    }

}
