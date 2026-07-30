import { Document } from "../document/Document";
import { Stroke } from "../document/Stroke";
import { DocumentImage } from "../document/DocumentImage";
import { DrawingContext } from "../models/DrawingContext";
import { StrokeRenderer } from "./StrokeRenderer";

export class DocumentRenderer {

    private readonly drawingContext: DrawingContext;
    private readonly document: Document;
    private readonly strokeRenderer: StrokeRenderer;
    private selectedStrokes: Set<Stroke>;
    private selectedImages: Set<DocumentImage>;
    private selectionBounds: { startX: number; startY: number; endX: number; endY: number } | null;
    private readonly loadedImages: Map<string, HTMLImageElement>;

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
        this.selectionBounds = null;
        this.loadedImages = new Map();

    }

    public render(activeStroke: Stroke | null = null): void {

        this.drawingContext.clear();

        const page = this.document.getCurrentPage();

        for (const image of page.getImages()) {
            this.renderImage(image);
        }

        for (const stroke of page.getStrokes()) {

            this.strokeRenderer.render(stroke);

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

        this.renderSelectionBounds();

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
        this.selectionBounds = null;

    }

    public clearSelectionBounds(): void {

        this.selectionBounds = null;

    }

    private renderSelectionBounds(): void {

        if (this.selectionBounds === null) {
            return;
        }

        const { startX, startY, endX, endY } = this.selectionBounds;
        const context = this.drawingContext.getContext();

        context.save();
        context.strokeStyle = "#2563eb";
        context.fillStyle = "rgb(37 99 235 / 8%)";
        context.lineWidth = 1;
        context.setLineDash([5, 5]);
        context.fillRect(startX, startY, endX - startX, endY - startY);
        context.strokeRect(startX, startY, endX - startX, endY - startY);
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

        context.save();
        context.strokeStyle = "#2563eb";
        context.lineWidth = 2;
        context.setLineDash([6, 6]);
        context.strokeRect(
            documentImage.getX() - 3,
            documentImage.getY() - 3,
            documentImage.getWidth() + 6,
            documentImage.getHeight() + 6
        );
        context.restore();

    }

}
