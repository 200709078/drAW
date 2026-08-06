import { HistoryManager } from "../core/HistoryManager";
import { Document } from "../document/Document";
import { DocumentImage } from "../document/DocumentImage";
import { DrawingContext } from "../models/DrawingContext";
import type { ScreenCaptureGateway } from "../platform/ScreenCaptureGateway";
import type { ScreenCaptureResult } from "../types/electron-api";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { ToolManager } from "../core/ToolManager";
import { PenTool } from "./PenTool";
import { SelectionTool } from "./SelectionTool";
import { Tool } from "./Tool";

export class ScreenCaptureTool extends Tool {

    private readonly drawingDocument: Document;
    private readonly renderer: DocumentRenderer;
    private readonly history: HistoryManager;
    private readonly gateway: ScreenCaptureGateway | null;
    private readonly toolManager: ToolManager;
    private readonly penTool: PenTool;
    private readonly selectionTool: SelectionTool;
    private isCapturing: boolean;

    constructor(
        drawingContext: DrawingContext,
        drawingDocument: Document,
        renderer: DocumentRenderer,
        history: HistoryManager,
        gateway: ScreenCaptureGateway | null,
        toolManager: ToolManager,
        penTool: PenTool,
        selectionTool: SelectionTool
    ) {

        super(drawingContext);
        this.drawingDocument = drawingDocument;
        this.renderer = renderer;
        this.history = history;
        this.gateway = gateway;
        this.toolManager = toolManager;
        this.penTool = penTool;
        this.selectionTool = selectionTool;
        this.isCapturing = false;

    }

    public override activate(): void {

        if (this.gateway === null || this.isCapturing) {
            this.toolManager.setTool(this.penTool);

            return;
        }

        this.isCapturing = true;
        void this.capture();

    }

    public override deactivate(): void {

        if (this.isCapturing) {
            this.gateway?.cancelScreenCapture();
        }

    }

    public override onPointerDown(): void {

    }

    public override onPointerMove(): void {

    }

    public override onPointerUp(): void {

    }

    public override cancel(): void {

        this.gateway?.cancelScreenCapture();

    }

    private async capture(): Promise<void> {

        let result: ScreenCaptureResult | null = null;

        try {
            const captured = await this.gateway?.requestScreenCapture();

            if (captured !== undefined && captured !== null) {
                result = captured;
                this.addImage(result.dataUrl, result.width, result.height);
            }

            if (this.toolManager.getActiveTool() === this) {
                this.toolManager.setTool(result !== null ? this.selectionTool : this.penTool);
            }
        } finally {
            this.isCapturing = false;
        }

    }

    private addImage(dataUrl: string, width: number, height: number): void {

        this.history.begin();
        this.drawingDocument.getCurrentPage().addImage(new DocumentImage(
            dataUrl,
            0,
            0,
            width,
            height
        ));
        this.history.commit();
        this.renderer.render();

    }

}
