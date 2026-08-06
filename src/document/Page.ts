import { Stroke } from "./Stroke";
import { DocumentImage } from "./DocumentImage";
import { TextObject } from "./TextObject";

export class Page {

    private readonly strokes: Stroke[];
    private readonly images: DocumentImage[];
    private readonly texts: TextObject[];

    constructor() {

        this.strokes = [];
        this.images = [];
        this.texts = [];

    }

    public addStroke(stroke: Stroke): void {

        this.strokes.push(stroke);

    }

    public removeStroke(stroke: Stroke): void {

        const index = this.strokes.indexOf(stroke);

        if (index !== -1) {
            this.strokes.splice(index, 1);
        }

    }

    public replaceStroke(stroke: Stroke, replacements: readonly Stroke[]): void {

        const index = this.strokes.indexOf(stroke);

        if (index !== -1) {
            this.strokes.splice(index, 1, ...replacements);
        }

    }

    public clearStrokes(): void {

        this.strokes.length = 0;
        this.images.length = 0;
        this.texts.length = 0;

    }

    public setStrokes(strokes: readonly Stroke[]): void {

        this.strokes.length = 0;
        this.strokes.push(...strokes);

    }

    public addImage(image: DocumentImage): void {

        this.images.push(image);

    }

    public removeImage(image: DocumentImage): void {

        const index = this.images.indexOf(image);

        if (index !== -1) {
            this.images.splice(index, 1);
        }

    }

    public setImages(images: readonly DocumentImage[]): void {

        this.images.length = 0;
        this.images.push(...images);

    }

    public addText(text: TextObject): void {

        this.texts.push(text);

    }

    public removeText(text: TextObject): void {

        const index = this.texts.indexOf(text);

        if (index !== -1) {
            this.texts.splice(index, 1);
        }

    }

    public setTexts(texts: readonly TextObject[]): void {

        this.texts.length = 0;
        this.texts.push(...texts);

    }

    public getTexts(): readonly TextObject[] {

        return this.texts;

    }

    public getImages(): readonly DocumentImage[] {

        return this.images;

    }

    public getStrokes(): readonly Stroke[] {

        return this.strokes;

    }

}
