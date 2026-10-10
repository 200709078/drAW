import type { ToolManager } from "./ToolManager";
import type { Tool } from "../tools/Tool";

export class EraserIdleReturn {

    private readonly toolManager: ToolManager;
    private readonly erasers: readonly Tool[];
    private readonly selectPen: () => void;
    private readonly activePointers = new Set<number>();
    private timer: ReturnType<typeof setTimeout> | null = null;

    constructor(
        toolManager: ToolManager,
        erasers: readonly Tool[],
        selectPen: () => void,
        input: Document = document,
        focus: Window = window
    ) {

        this.toolManager = toolManager;
        this.erasers = erasers;
        this.selectPen = selectPen;
        const options = { capture: true, passive: true };

        input.addEventListener("pointerdown", (event) => {
            this.activePointers.add(event.pointerId);
            this.restart();
        }, options);

        const endPointer = (event: PointerEvent): void => {
            this.activePointers.delete(event.pointerId);
            this.restart();
        };
        input.addEventListener("pointerup", endPointer, options);
        input.addEventListener("pointercancel", endPointer, options);
        input.addEventListener("lostpointercapture", endPointer, options);

        for (const event of ["pointermove", "click", "keydown", "wheel"]) {
            input.addEventListener(event, () => this.restart(), options);
        }

        focus.addEventListener("blur", () => {
            // Pencere dışında biten temasın sayacı kalıcı olarak durdurmasını önle.
            this.activePointers.clear();
            this.restart();
        });
        toolManager.addChangeListener(() => this.restart());
        this.restart();

    }

    private isEraserSelected(): boolean {

        const tool = this.toolManager.getActiveTool();

        return tool !== null && this.erasers.includes(tool);

    }

    private restart(): void {

        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        // Temas sürerken araç değiştirmek kalan hareketin çizgiye dönüşmesine yol açabilir.
        if (!this.isEraserSelected() || this.activePointers.size > 0) {
            return;
        }

        this.timer = setTimeout(() => {
            this.timer = null;

            if (this.isEraserSelected() && this.activePointers.size === 0) {
                this.selectPen();
            }
        }, 4000);

    }

}
