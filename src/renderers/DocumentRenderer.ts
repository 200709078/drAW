import { Document } from "../document/Document";
import { Stroke } from "../document/Stroke";
import { DocumentImage } from "../document/DocumentImage";
import { TextObject, TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT } from "../document/TextObject";
import { DrawingContext } from "../models/DrawingContext";
import { StrokeRenderer } from "./StrokeRenderer";
import { ALL_RESIZE_HANDLES, getResizeHandlePosition, type SelectionBounds } from "./ResizeHandle";

export type GuideLineType = "none" | "grid" | "rows" | "columns";

export class DocumentRenderer {

    private readonly drawingContext: DrawingContext;
    private readonly document: Document;
    private readonly strokeRenderer: StrokeRenderer;
    private selectedStrokes: Set<Stroke>;
    private selectedImages: Set<DocumentImage>;
    private selectedTexts: Set<TextObject>;
private selectionBounds: { startX: number; startY: number; endX: number; endY: number } | null;
    private readonly loadedImages: Map<string, HTMLImageElement>;
    private guideLines: GuideLineType;

    constructor(
        drawingContext: DrawingContext,
        document: Document
    ) {

        this.drawingContext = drawingContext;
        this.document = document;

        this.strokeRenderer = new StrokeRenderer(
            drawingContext
        );
        this.selectedStrokes = new Set();
        this.selectedImages = new Set();
this.selectedTexts = new Set();
        this.selectionBounds = null;
        this.loadedImages = new Map();
        this.guideLines = "none";

    }

    public setGuideLines(guideLines: GuideLineType): void {

        this.guideLines = guideLines;

    }

    public getGuideLines(): GuideLineType {

        return this.guideLines;

    }

    public render(activeStroke: Stroke | null = null): void {

        this.drawingContext.clear();
        this.applyViewportTransform();
        this.renderGuideLines();

        const page = this.document.getCurrentPage();

        for (const image of page.getImages()) {
            this.renderImage(image);
        }

        for (const stroke of page.getStrokes()) {

            this.strokeRenderer.render(stroke);

        }

        for (const text of page.getTexts()) {
            this.renderText(text);
        }

        if (activeStroke !== null) {
            this.strokeRenderer.render(activeStroke);
        }

        for (const stroke of this.selectedStrokes) {
            this.strokeRenderer.renderSelection(stroke);
        }

        for (const image of this.selectedImages) {
            this.renderImageSelection(image);
        }

        for (const text of this.selectedTexts) {
            this.renderTextSelection(text);
        }

        this.renderSelectionBounds();
        this.renderResizeHandles();

    }

    public setSelectedStroke(stroke: Stroke | null): void {

        this.selectedStrokes = stroke === null ? new Set() : new Set([stroke]);

    }

    public setSelectedStrokes(strokes: readonly Stroke[]): void {

        this.selectedStrokes = new Set(strokes);

    }

    public setSelectedImages(images: readonly DocumentImage[]): void {

        this.selectedImages = new Set(images);

    }

    public setSelectedTexts(texts: readonly TextObject[]): void {

        this.selectedTexts = new Set(texts);

    }

    public removeSelectedText(text: TextObject): void {

        this.selectedTexts.delete(text);

    }

    public setSelectionBounds(
        startX: number,
        startY: number,
        endX: number,
        endY: number
    ): void {

        this.selectionBounds = { startX, startY, endX, endY };

    }

    public clearSelection(): void {

        this.selectedStrokes.clear();
        this.selectedImages.clear();
        this.selectedTexts.clear();
        this.selectionBounds = null;

    }

    public clearSelectionBounds(): void {

        this.selectionBounds = null;

    }

    public getSelectionBounds(): SelectionBounds | null {

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const stroke of this.selectedStrokes) {
            for (const point of stroke.getPoints()) {
                minX = Math.min(minX, point.getX());
                minY = Math.min(minY, point.getY());
                maxX = Math.max(maxX, point.getX());
                maxY = Math.max(maxY, point.getY());
            }
        }

        for (const image of this.selectedImages) {
            minX = Math.min(minX, image.getX());
            minY = Math.min(minY, image.getY());
            maxX = Math.max(maxX, image.getX() + image.getWidth());
            maxY = Math.max(maxY, image.getY() + image.getHeight());
        }

        for (const text of this.selectedTexts) {
            const bounds = this.getTextBounds(text);

            minX = Math.min(minX, bounds.minX);
            minY = Math.min(minY, bounds.minY);
            maxX = Math.max(maxX, bounds.maxX);
            maxY = Math.max(maxY, bounds.maxY);
        }

        if (minX === Infinity) {
            return null;
        }

        return { minX, minY, maxX, maxY };

    }

    private applyViewportTransform(): void {

        const viewport = this.drawingContext.getViewport();
        const context = this.drawingContext.getContext();
        const pixelRatio = window.devicePixelRatio || 1;
        const scale = viewport.getScale();

        context.setTransform(
            pixelRatio * scale,
            0,
            0,
            pixelRatio * scale,
            pixelRatio * viewport.getOffsetX(),
            pixelRatio * viewport.getOffsetY()
        );

    }

    private renderResizeHandles(): void {

        const bounds = this.getSelectionBounds();

        if (bounds === null) {
            return;
        }

        const context = this.drawingContext.getContext();
        // Seçim çizgileri ekranda sabit kalınlıkta görünsün.
        const unit = 1 / this.drawingContext.getViewport().getScale();
        const handleSize = 6 * unit;

        context.save();
        context.strokeStyle = "#2563eb";
        context.lineWidth = 1.5 * unit;
        context.setLineDash([]);
        context.strokeRect(
            bounds.minX,
            bounds.minY,
            bounds.maxX - bounds.minX,
            bounds.maxY - bounds.minY
        );

        context.fillStyle = "#ffffff";

        for (const handle of ALL_RESIZE_HANDLES) {
            const position = getResizeHandlePosition(handle, bounds);

            context.fillRect(
                position.x - handleSize,
                position.y - handleSize,
                handleSize * 2,
                handleSize * 2
            );
            context.strokeRect(
                position.x - handleSize,
                position.y - handleSize,
                handleSize * 2,
                handleSize * 2
            );
        }

        context.restore();

    }

    private renderSelectionBounds(): void {

        if (this.selectionBounds === null) {
            return;
        }

        const { startX, startY, endX, endY } = this.selectionBounds;
        const context = this.drawingContext.getContext();
        const unit = 1 / this.drawingContext.getViewport().getScale();

        context.save();
        context.strokeStyle = "#2563eb";
        context.fillStyle = "rgb(37 99 235 / 8%)";
        context.lineWidth = 1 * unit;
        context.setLineDash([5 * unit, 5 * unit]);
        context.fillRect(startX, startY, endX - startX, endY - startY);
        context.strokeRect(startX, startY, endX - startX, endY - startY);
        context.restore();

    }

    private renderGuideLines(): void {

        const type = this.guideLines;

        if (type === "none") {
            return;
        }

        const context = this.drawingContext.getContext();
        const viewport = this.drawingContext.getViewport();
        const unit = 1 / viewport.getScale();
        const width = this.drawingContext.getCssWidth();
        const height = this.drawingContext.getCssHeight();
        const spacing = 50;

        context.save();
        context.strokeStyle = "#d1d5db";
        context.fillStyle = "#d1d5db";
        context.lineWidth = 1 * unit;
        context.setLineDash([]);
        context.beginPath();

        const drawVerticals = type === "grid" || type === "columns";
        const drawHorizontals = type === "grid" || type === "rows";

        // Görünür dünya alanını kapla.
        const minWorldX = viewport.screenToWorldX(0);
        const maxWorldX = viewport.screenToWorldX(width);
        const minWorldY = viewport.screenToWorldY(0);
        const maxWorldY = viewport.screenToWorldY(height);

        if (drawVerticals) {
            for (let x = Math.floor(minWorldX / spacing) * spacing; x <= maxWorldX; x += spacing) {
                context.moveTo(x, minWorldY);
                context.lineTo(x, maxWorldY);
            }
        }

        if (drawHorizontals) {
            for (let y = Math.floor(minWorldY / spacing) * spacing; y <= maxWorldY; y += spacing) {
                context.moveTo(minWorldX, y);
                context.lineTo(maxWorldX, y);
            }
        }

        context.stroke();
        context.restore();

    }

    private renderImage(documentImage: DocumentImage): void {

        const source = documentImage.getDataUrl();
        let image = this.loadedImages.get(source);

        if (image === undefined) {
            image = new Image();
            image.addEventListener("load", () => this.render(), { once: true });
            image.src = source;
            this.loadedImages.set(source, image);
        }

        if (!image.complete || image.naturalWidth === 0) {
            return;
        }

        this.drawingContext.getContext().drawImage(
            image,
            documentImage.getX(),
            documentImage.getY(),
            documentImage.getWidth(),
            documentImage.getHeight()
        );

    }

    private renderImageSelection(documentImage: DocumentImage): void {

        const context = this.drawingContext.getContext();
        const unit = 1 / this.drawingContext.getViewport().getScale();

        context.save();
        context.strokeStyle = "#2563eb";
        context.lineWidth = 2 * unit;
        context.setLineDash([6 * unit, 6 * unit]);
        context.strokeRect(
            documentImage.getX() - 3 * unit,
            documentImage.getY() - 3 * unit,
            documentImage.getWidth() + 6 * unit,
            documentImage.getHeight() + 6 * unit
        );
        context.restore();

    }

    public measureText(text: string, fontSize: number): { width: number; height: number } {

        const context = this.drawingContext.getContext();
        const lines = text.split("\n");

        context.save();
        context.font = `${fontSize}px ${TEXT_FONT_FAMILY}`;

        let width = 0;

        for (const line of lines) {
            width = Math.max(width, context.measureText(line).width);
        }

        context.restore();

        return {
            width,
            height: lines.length * fontSize * TEXT_LINE_HEIGHT
        };

    }

    public getTextBounds(text: TextObject): SelectionBounds {

        return text.getBounds((content, fontSize) => this.measureText(content, fontSize));

    }

    private renderText(text: TextObject): void {

        const context = this.drawingContext.getContext();
        const fontSize = text.getFontSize() * text.getScale();
        const lineHeight = fontSize * TEXT_LINE_HEIGHT;
        const lines = text.getText().split("\n");
        const blockHeight = lines.length * lineHeight;
        const topY = text.getY() - blockHeight / 2;

        context.save();
        context.font = `${fontSize}px ${TEXT_FONT_FAMILY}`;
        context.fillStyle = text.getColor();
        context.textBaseline = "top";

        for (let index = 0; index < lines.length; index++) {
            context.fillText(
                lines[index],
                text.getX(),
                topY + index * lineHeight
            );
        }

        context.restore();

    }

    private renderTextSelection(text: TextObject): void {

        const bounds = this.getTextBounds(text);
        const context = this.drawingContext.getContext();
        const unit = 1 / this.drawingContext.getViewport().getScale();

        context.save();
        context.strokeStyle = "#2563eb";
        context.lineWidth = 2 * unit;
        context.setLineDash([6 * unit, 6 * unit]);
        context.strokeRect(
            bounds.minX - 3 * unit,
            bounds.minY - 3 * unit,
            bounds.maxX - bounds.minX + 6 * unit,
            bounds.maxY - bounds.minY + 6 * unit
        );
        context.restore();

    }

}
