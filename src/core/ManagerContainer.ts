import { CanvasManager } from "../core/CanvasManager";
import { PointerManager } from "../core//PointerManager";
import { ToolManager } from "../core/ToolManager";

import { DrawingContext } from "../models/DrawingContext";

import { Document } from "../document/Document";

import { DocumentRenderer } from "../renderers/DocumentRenderer";

import { PenTool } from "../tools/PenTool";
import { EraserTool } from "../tools/EraserTool";
import { HighlighterTool } from "../tools/HighlighterTool";
import { SelectionTool } from "../tools/SelectionTool";
import { PartialEraserTool } from "../tools/PartialEraserTool";
import { HistoryManager } from "./HistoryManager";
import { ScreenCaptureTool } from "../tools/ScreenCaptureTool";
import { getScreenCaptureGateway } from "../platform/ScreenCaptureGateway";

export class ManagerContainer {

    private readonly canvasManager: CanvasManager;
    private readonly toolManager: ToolManager;
    private readonly pointerManager: PointerManager;
    private readonly penTool: PenTool;
    private readonly eraserTool: EraserTool;
    private readonly highlighterTool: HighlighterTool;
    private readonly selectionTool: SelectionTool;
    private readonly partialEraserTool: PartialEraserTool;
    private readonly historyManager: HistoryManager;
    private readonly screenCaptureTool: ScreenCaptureTool;

    private readonly drawingContext: DrawingContext;

    private readonly document: Document;
    private readonly documentRenderer: DocumentRenderer;

    constructor() {

        // Canvas
        this.canvasManager = new CanvasManager();

        // Drawing Context
        this.drawingContext = new DrawingContext(
            this.canvasManager.getCanvas(),
            this.canvasManager.getContext()
        );

        // Document
        this.document = new Document();
        this.historyManager = new HistoryManager(this.document);

        // Renderer
        this.documentRenderer = new DocumentRenderer(
            this.drawingContext,
            this.document
        );

        this.canvasManager.addResizeListener(() => {
            this.documentRenderer.render();
        });

        // Tool Manager
        this.toolManager = new ToolManager();

        // Pointer Manager
        this.pointerManager = new PointerManager(
            this.canvasManager.getCanvas(),
            this.toolManager
        );

        // Varsayılan araç
        this.penTool = new PenTool(
            this.drawingContext,
            this.document,
            this.documentRenderer,
            this.historyManager
        );
        this.eraserTool = new EraserTool(
            this.drawingContext,
            this.document,
            this.documentRenderer,
            this.historyManager
        );
        this.highlighterTool = new HighlighterTool(
            this.drawingContext,
            this.document,
            this.documentRenderer,
            this.historyManager
        );
        this.selectionTool = new SelectionTool(
            this.drawingContext,
            this.document,
            this.documentRenderer,
            this.historyManager
        );
        this.partialEraserTool = new PartialEraserTool(
            this.drawingContext,
            this.document,
            this.documentRenderer,
            this.historyManager
        );
        this.screenCaptureTool = new ScreenCaptureTool(
            this.drawingContext,
            this.document,
            this.documentRenderer,
            this.historyManager,
            getScreenCaptureGateway(),
            this.toolManager,
            this.penTool,
            this.selectionTool
        );
        this.toolManager.setTool(this.penTool);

    }

    public getCanvasManager(): CanvasManager {

        return this.canvasManager;

    }

    public getDrawingContext(): DrawingContext {

        return this.drawingContext;

    }

    public getDocument(): Document {

        return this.document;

    }

    public getDocumentRenderer(): DocumentRenderer {

        return this.documentRenderer;

    }

    public getToolManager(): ToolManager {

        return this.toolManager;

    }

    public getPointerManager(): PointerManager {

        return this.pointerManager;

    }

    public getPenTool(): PenTool {

        return this.penTool;

    }

    public getEraserTool(): EraserTool {

        return this.eraserTool;

    }

    public getHighlighterTool(): HighlighterTool {

        return this.highlighterTool;

    }

    public getSelectionTool(): SelectionTool {

        return this.selectionTool;

    }

    public getPartialEraserTool(): PartialEraserTool {

        return this.partialEraserTool;

    }

    public getHistoryManager(): HistoryManager {

        return this.historyManager;

    }

    public getScreenCaptureTool(): ScreenCaptureTool {

        return this.screenCaptureTool;

    }

}
