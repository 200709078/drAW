import { DocumentStateSerializer } from "./DocumentStateSerializer";
import { StrokeRenderer } from "../renderers/StrokeRenderer";
import { DrawingContext } from "../models/DrawingContext";
import { TextObject, TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT } from "../document/TextObject";
import type { ThumbnailData } from "../storage/DrawingDocument";

export class ThumbnailGenerator {

    private static readonly WIDTH = 800;
    private static readonly HEIGHT = 600;
    private readonly serializer: DocumentStateSerializer;

    constructor(
        serializer?: DocumentStateSerializer
    ) {

        this.serializer = serializer ?? new DocumentStateSerializer();

    }

    public async generate(data: Record<string, unknown>): Promise<ThumbnailData> {

        const snapshot = this.serializer.deserialize(data);

        const canvas = document.createElement("canvas");
        canvas.width = ThumbnailGenerator.WIDTH;
        canvas.height = ThumbnailGenerator.HEIGHT;

        const context = canvas.getContext("2d");

        if (context === null) {
            throw new Error("Thumbnail canvas 2D bağlamı oluşturulamadı.");
        }

        const sourceWidth = window.innerWidth;
        const sourceHeight = window.innerHeight;
        const scale = Math.min(
            ThumbnailGenerator.WIDTH / sourceWidth,
            ThumbnailGenerator.HEIGHT / sourceHeight
        );
        const offsetX = (ThumbnailGenerator.WIDTH - sourceWidth * scale) / 2;
        const offsetY = (ThumbnailGenerator.HEIGHT - sourceHeight * scale) / 2;

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, ThumbnailGenerator.WIDTH, ThumbnailGenerator.HEIGHT);

        context.save();
        context.translate(offsetX, offsetY);
        context.scale(scale, scale);

        const loadedImages = await this.loadImages(snapshot.images.map((image) => image.getDataUrl()));

        for (const image of snapshot.images) {
            const element = loadedImages.get(image.getDataUrl());

            if (element === undefined) {
                continue;
            }

            context.drawImage(
                element,
                image.getX(),
                image.getY(),
                image.getWidth(),
                image.getHeight()
            );
        }

        const drawingContext = new DrawingContext(canvas, context);
        const strokeRenderer = new StrokeRenderer(drawingContext);

        for (const stroke of snapshot.strokes) {
            strokeRenderer.render(stroke);
        }

        for (const text of snapshot.texts) {
            this.renderText(context, text);
        }

        context.restore();

        return {
            dataUrl: canvas.toDataURL("image/png")
        };

    }

    private renderText(
        context: CanvasRenderingContext2D,
        text: TextObject
    ): void {

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

    private async loadImages(
        dataUrls: readonly string[]
    ): Promise<Map<string, HTMLImageElement>> {

        const unique = Array.from(new Set(dataUrls));
        const loaded = new Map<string, HTMLImageElement>();

        await Promise.all(unique.map((dataUrl) => this.loadImage(dataUrl, loaded)));

        return loaded;

    }

    private loadImage(
        dataUrl: string,
        target: Map<string, HTMLImageElement>
    ): Promise<void> {

        return new Promise<void>((resolve) => {
            const image = new Image();

            image.addEventListener("load", () => {
                target.set(dataUrl, image);
                resolve();
            });
            image.addEventListener("error", () => {
                resolve();
            });

            image.src = dataUrl;
        });

    }

}
