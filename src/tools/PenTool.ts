import { Tool } from "./Tool";
import { DrawingContext } from "../models/DrawingContext";

import { Document } from "../document/Document";
import { Stroke } from "../document/Stroke";
import { Point } from "../document/Point";

import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { HistoryManager } from "../core/HistoryManager";
import { CursorRing } from "../ui/CursorRing";

export class PenTool extends Tool {

    private static readonly CURSOR = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='%23111827' d='m5 27 3-8L23 4l5 5-15 15z'/%3E%3Cpath fill='%23fff' d='m21.6 5.4 5 5-1.7 1.7-5-5z'/%3E%3Cpath fill='%232563eb' d='m5 27 3-8 5 5z'/%3E%3C/svg%3E\") 5 27, crosshair";

    private readonly document: Document;
    private readonly renderer: DocumentRenderer;
    private readonly history: HistoryManager;

    private currentStroke: Stroke | null;
    private activePointerId: number | null;
    private cursorRing: CursorRing | null;
    private color: string;
    private lineWidth: number;
    private readonly opacity: number;
    private readonly lineWidthMultiplier: number;

    constructor(
        drawingContext: DrawingContext,
        document: Document,
        renderer: DocumentRenderer,
        history: HistoryManager,
        opacity: number = 1,
        lineWidthMultiplier: number = 1
    ) {

        super(drawingContext);

        this.document = document;
        this.renderer = renderer;
        this.history = history;

        this.currentStroke = null;
        this.activePointerId = null;
        this.cursorRing = null;
        this.color = "#111827";
        this.lineWidth = 6;
        this.opacity = opacity;
        this.lineWidthMultiplier = lineWidthMultiplier;

    }

    public override activate(): void {

        this.canvas.style.cursor = PenTool.CURSOR;
        this.cursorRing = new CursorRing();
        this.cursorRing.setColor(this.color);
        this.canvas.addEventListener("mousemove", this.handleHover);
        this.canvas.addEventListener("mouseleave", this.handleHoverLeave);

    }

    public override deactivate(): void {

        this.canvas.removeEventListener("mousemove", this.handleHover);
        this.canvas.removeEventListener("mouseleave", this.handleHoverLeave);
        this.cursorRing?.destroy();
        this.cursorRing = null;
        this.currentStroke = null;
        this.activePointerId = null;
        this.history.discard();

    }

    private readonly handleHover = (event: MouseEvent): void => {

        this.cursorRing?.move(event.clientX, event.clientY, this.screenDiameter());

    };

    private readonly handleHoverLeave = (): void => {

        if (this.currentStroke === null) {
            this.cursorRing?.hide();
        }

    };

    private effectiveLineWidth(): number {

        return this.lineWidth * this.lineWidthMultiplier;

    }

    private screenDiameter(): number {

        return this.effectiveLineWidth() * this.drawingContext.getViewport().getScale();

    }

    public override onPointerDown(event: PointerEvent): void {

        // Çizim sürerken ikinci parmağı yok say.
        if (this.currentStroke !== null) {
            return;
        }

        this.activePointerId = event.pointerId;
        this.history.begin();

        this.currentStroke = new Stroke(
            this.color,
            this.effectiveLineWidth(),
            this.opacity
        );

        this.currentStroke.addPoint(
            new Point(
                this.worldX(event),
                this.worldY(event),
                this.getPressure(event)
            )
        );

        this.cursorRing?.move(event.clientX, event.clientY, this.screenDiameter());

    }

    public override onPointerMove(event: PointerEvent): void {

        if (this.currentStroke === null) {
            return;
        }

        if (this.activePointerId !== null && event.pointerId !== this.activePointerId) {
            return;
        }

        this.appendPointerPoint(event);
        this.renderer.render(this.currentStroke);
        this.cursorRing?.move(event.clientX, event.clientY, this.screenDiameter());

    }

    public override onPointerUp(event: PointerEvent): void {

        if (this.currentStroke === null) {
            return;
        }

        if (this.activePointerId !== null && event.pointerId !== this.activePointerId) {
            return;
        }

        this.appendPointerPoint(event);

        this.document
            .getCurrentPage()
            .addStroke(this.currentStroke);

        this.currentStroke = null;
        this.activePointerId = null;

        this.history.commit();

        this.renderer.render();

        if (event.pointerType === "touch") {
            this.cursorRing?.hide();
        } else {
            this.cursorRing?.move(event.clientX, event.clientY, this.screenDiameter());
        }

    }

    public override cancel(): void {

        this.currentStroke = null;
        this.activePointerId = null;
        this.cursorRing?.hide();
        this.history.discard();
        this.renderer.render();

    }

    public setColor(color: string): void {

        this.color = color;
        this.cursorRing?.setColor(color);

    }

    public getColor(): string {

        return this.color;

    }

    public setLineWidth(lineWidth: number): void {

        if (Number.isFinite(lineWidth) && lineWidth > 0) {
            this.lineWidth = lineWidth;
        }

    }

    public getLineWidth(): number {

        return this.lineWidth;

    }

    private appendPointerPoint(event: PointerEvent): void {

        if (this.currentStroke === null) {
            return;
        }

        // Dokunmatik/kalem girişinde tarama arası örnekleri de işle,
        // hızlı hareketlerde çizgi daha düzgün olur.
        const coalesced = event.pointerType !== "mouse" &&
            typeof event.getCoalescedEvents === "function"
            ? event.getCoalescedEvents()
            : [];

        if (coalesced.length === 0) {
            this.currentStroke.addPoint(
                new Point(
                    this.worldX(event),
                    this.worldY(event),
                    this.getPressure(event)
                )
            );

            return;
        }

        const viewport = this.drawingContext.getViewport();
        const rect = this.canvas.getBoundingClientRect();

        for (const coalescedEvent of coalesced) {
            this.currentStroke.addPoint(
                new Point(
                    viewport.screenToWorldX(coalescedEvent.clientX - rect.left),
                    viewport.screenToWorldY(coalescedEvent.clientY - rect.top),
                    this.getPressure(coalescedEvent)
                )
            );
        }

    }

    private getPressure(event: PointerEvent): number {

        return event.pointerType === "mouse" ? 1 : event.pressure;

    }

}
