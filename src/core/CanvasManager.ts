export class CanvasManager {

    private canvas!: HTMLCanvasElement;
    private context!: CanvasRenderingContext2D;
    private readonly resizeListeners: Set<() => void>;

    constructor() {

        this.resizeListeners = new Set();

        this.createCanvas();
        this.resizeCanvas();
        window.addEventListener("resize", this.onWindowResize);

    }

    private createCanvas(): void {

        this.canvas = document.createElement("canvas");

        const context = this.canvas.getContext("2d");

        if (!context) {
            throw new Error("Canvas 2D Context oluşturulamadı.");
        }

        this.context = context;

        document.getElementById("app")?.appendChild(this.canvas);

    }

    private resizeCanvas(): void {

        const width = window.innerWidth;
        const height = window.innerHeight;
        const pixelRatio = window.devicePixelRatio || 1;

        this.canvas.width = Math.floor(width * pixelRatio);
        this.canvas.height = Math.floor(height * pixelRatio);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    }

    private onWindowResize = (): void => {

        this.resizeCanvas();

        for (const listener of this.resizeListeners) {
            listener();
        }

    };

    public addResizeListener(listener: () => void): void {

        this.resizeListeners.add(listener);

    }

    public getCanvas(): HTMLCanvasElement {

        return this.canvas;

    }

    public getContext(): CanvasRenderingContext2D {

        return this.context;

    }

}
