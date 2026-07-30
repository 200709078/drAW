import { Stroke } from "./Stroke";
import { DocumentImage } from "./DocumentImage";

export class Page {

    private readonly strokes: Stroke[];
    private readonly images: DocumentImage[];

    constructor() {

        this.strokes = [];
        this.images = [];

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

    }

    public setStrokes(strokes: readonly Stroke[]): void {

        this.strokes.length = 0;
        this.strokes.push(...strokes);

    }

    public addImage(image: DocumentImage): void {

        this.images.push(image);

    }

    public setImages(images: readonly DocumentImage[]): void {

        this.images.length = 0;
        this.images.push(...images);

    }

    public getImages(): readonly DocumentImage[] {

        return this.images;

    }

    public getStrokes(): readonly Stroke[] {

        return this.strokes;

    }

}
