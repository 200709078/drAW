import { Page } from "./Page";
import { Point } from "./Point";
import { Stroke } from "./Stroke";
import { DocumentImage } from "./DocumentImage";
import { TextObject } from "./TextObject";

export type DocumentSnapshot = {
    strokes: readonly Stroke[];
    images: readonly DocumentImage[];
    texts: readonly TextObject[];
};

export class Document {

    private readonly pages: Page[];
    private currentPageIndex: number;

    constructor() {

        this.pages = [];
        this.pages.push(new Page());

        this.currentPageIndex = 0;

    }

    public getCurrentPage(): Page {

        return this.pages[this.currentPageIndex];

    }

    public clearCurrentPage(): void {

        this.getCurrentPage().clearStrokes();

    }

    public createSnapshot(): DocumentSnapshot {

        const page = this.getCurrentPage();

        return {
            strokes: page.getStrokes().map((stroke) => this.cloneStroke(stroke)),
            images: page.getImages().map((image) => this.cloneImage(image)),
            texts: page.getTexts().map((text) => this.cloneText(text))
        };

    }

    public restoreSnapshot(snapshot: DocumentSnapshot): void {

        const page = this.getCurrentPage();

        page.setStrokes(snapshot.strokes.map((stroke) => this.cloneStroke(stroke)));
        page.setImages(snapshot.images.map((image) => this.cloneImage(image)));
        page.setTexts(snapshot.texts.map((text) => this.cloneText(text)));

    }

    public snapshotsMatch(first: DocumentSnapshot, second: DocumentSnapshot): boolean {

        return JSON.stringify(this.serialize(first)) === JSON.stringify(this.serialize(second));

    }

    private cloneStroke(stroke: Stroke): Stroke {

        const copy = new Stroke(stroke.getColor(), stroke.getLineWidth(), stroke.getOpacity());

        for (const point of stroke.getPoints()) {
            copy.addPoint(new Point(
                point.getX(),
                point.getY(),
                point.getPressure(),
                point.getTimestamp()
            ));
        }

        return copy;

    }

    private cloneImage(image: DocumentImage): DocumentImage {

        return new DocumentImage(
            image.getDataUrl(),
            image.getX(),
            image.getY(),
            image.getWidth(),
            image.getHeight()
        );

    }

    private cloneText(text: TextObject): TextObject {

        return new TextObject(
            text.getText(),
            text.getX(),
            text.getY(),
            text.getColor(),
            text.getFontSize(),
            text.getScale(),
            text.getRotation()
        );

    }

    private serialize(snapshot: DocumentSnapshot): unknown[] {

        return [
            ...snapshot.images.map((image) => ({
                type: "image",
                dataUrl: image.getDataUrl(),
                x: image.getX(),
                y: image.getY(),
                width: image.getWidth(),
                height: image.getHeight()
            })),
            ...snapshot.strokes.map((stroke) => ({
                type: "stroke",
            color: stroke.getColor(),
            lineWidth: stroke.getLineWidth(),
            opacity: stroke.getOpacity(),
            points: stroke.getPoints().map((point) => [
                point.getX(), point.getY(), point.getPressure(), point.getTimestamp()
            ])
            })),
            ...snapshot.texts.map((text) => ({
                type: "text",
                text: text.getText(),
                x: text.getX(),
                y: text.getY(),
                color: text.getColor(),
                fontSize: text.getFontSize(),
                scale: text.getScale(),
                rotation: text.getRotation()
            }))
        ];

    }

}
