import { Tool } from "./Tool";
import { DrawingContext } from "../models/DrawingContext";
import { Document } from "../document/Document";
import { Stroke } from "../document/Stroke";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { HistoryManager } from "../core/HistoryManager";
import { ToolManager } from "../core/ToolManager";
import { PenTool } from "./PenTool";
import { SelectionTool } from "./SelectionTool";
import { getShapePointFactory, type ShapeType } from "../shapes/ShapeFactory";

const MIN_SHAPE_SIZE = 2;

export class ShapesTool extends Tool {

    private readonly document: Document;
    private readonly renderer: DocumentRenderer;
    private readonly history: HistoryManager;
    private readonly toolManager: ToolManager;
    private readonly penTool: PenTool;
    private readonly selectionTool: SelectionTool;
    private shapeType: ShapeType;
    private startX: number;
    private startY: number;
    private previewStroke: Stroke | null;

    constructor(
        drawingContext: DrawingContext,
        document: Document,
        renderer: DocumentRenderer,
        history: HistoryManager,
        toolManager: ToolManager,
        penTool: PenTool,
        selectionTool: SelectionTool,
        shapeType: ShapeType = "rectangle"
    ) {

        super(drawingContext);

        this.document = document;
        this.renderer = renderer;
        this.history = history;
        this.toolManager = toolManager;
        this.penTool = penTool;
        this.selectionTool = selectionTool;
        this.shapeType = shapeType;
        this.startX = 0;
        this.startY = 0;
        this.previewStroke = null;

    }

    public override activate(): void {

        this.canvas.style.cursor = "crosshair";

    }

    public override deactivate(): void {

        this.previewStroke = null;
        this.history.discard();
        this.renderer.render();

    }

    public override onPointerDown(event: PointerEvent): void {

        this.history.begin();

        this.startX = event.offsetX;
        this.startY = event.offsetY;
        this.previewStroke = this.createStroke(event.offsetX, event.offsetY);

    }

    public override onPointerMove(event: PointerEvent): void {

        if (this.previewStroke === null) {
            return;
        }

        this.previewStroke = this.createStroke(event.offsetX, event.offsetY);
        this.renderer.render(this.previewStroke);

    }

    public override onPointerUp(event: PointerEvent): void {

        if (this.previewStroke === null) {
            return;
        }

        const stroke = this.createStroke(event.offsetX, event.offsetY);

        this.previewStroke = null;

        if (this.isDegenerate(stroke)) {
            this.history.discard();
            this.renderer.render();

            return;
        }

        this.document.getCurrentPage().addStroke(stroke);
        this.history.commit();
        this.renderer.render();
        this.toolManager.setTool(this.selectionTool);
        this.selectionTool.selectStroke(stroke);

    }

    public override cancel(): void {

        this.previewStroke = null;
        this.history.discard();
        this.renderer.render();

    }

    public setShapeType(shapeType: ShapeType): void {

        this.shapeType = shapeType;

    }

    public getShapeType(): ShapeType {

        return this.shapeType;

    }

    private createStroke(endX: number, endY: number): Stroke {

        const stroke = new Stroke(
            this.penTool.getColor(),
            this.penTool.getLineWidth(),
            1,
            true
        );
        const points = getShapePointFactory(this.shapeType)({
            startX: this.startX,
            startY: this.startY,
            endX,
            endY
        });

        for (const point of points) {
            stroke.addPoint(point);
        }

        return stroke;

    }

    private isDegenerate(stroke: Stroke): boolean {

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const point of stroke.getPoints()) {
            minX = Math.min(minX, point.getX());
            minY = Math.min(minY, point.getY());
            maxX = Math.max(maxX, point.getX());
            maxY = Math.max(maxY, point.getY());
        }

        return maxX - minX < MIN_SHAPE_SIZE && maxY - minY < MIN_SHAPE_SIZE;

    }

}
