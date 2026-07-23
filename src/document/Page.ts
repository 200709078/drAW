import { Stroke } from "./Stroke";

export class Page {

    private readonly strokes: Stroke[];

    constructor() {

        this.strokes = [];

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

    }

    public getStrokes(): readonly Stroke[] {

        return this.strokes;

    }

}
