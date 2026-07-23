import { ToolManager } from "./ToolManager";

export class PointerManager {

    private canvas: HTMLCanvasElement;
    private toolManager: ToolManager;

    constructor(
        canvas: HTMLCanvasElement,
        toolManager: ToolManager
    ) {

        this.canvas = canvas;
        this.toolManager = toolManager;

        this.attachEvents();

    }

    private attachEvents(): void {

        this.canvas.addEventListener("pointerdown", this.onPointerDown);
        this.canvas.addEventListener("pointermove", this.onPointerMove);
        this.canvas.addEventListener("pointerup", this.onPointerUp);
        this.canvas.addEventListener("pointercancel", this.onPointerCancel);

    }

    private onPointerDown = (event: PointerEvent): void => {

        const tool = this.toolManager.getActiveTool();

        if (!tool) {
            return;
        }

        this.canvas.setPointerCapture(event.pointerId);
        tool.onPointerDown(event);

    };

    private onPointerMove = (event: PointerEvent): void => {

        this.toolManager.getActiveTool()?.onPointerMove(event);

    };

    private onPointerUp = (event: PointerEvent): void => {

        this.toolManager.getActiveTool()?.onPointerUp(event);
        this.releasePointerCapture(event.pointerId);

    };

    private onPointerCancel = (event: PointerEvent): void => {

        this.toolManager.getActiveTool()?.cancel();
        this.releasePointerCapture(event.pointerId);

    };

    private releasePointerCapture(pointerId: number): void {

        if (this.canvas.hasPointerCapture(pointerId)) {
            this.canvas.releasePointerCapture(pointerId);
        }

    }

}
