import type { SelectionBounds } from "../renderers/ResizeHandle";

export const TEXT_FONT_FAMILY = "sans-serif";
export const TEXT_LINE_HEIGHT = 1.2;

export type TextMeasure = (text: string, fontSize: number) => { width: number; height: number };

export class TextObject {

    private text: string;
    private x: number;
    private y: number;
    private color: string;
    private fontSize: number;
    private scale: number;
    private readonly rotation: number;
    private selected: boolean;

    constructor(
        text: string = "Metin",
        x: number = 0,
        y: number = 0,
        color: string = "#111827",
        fontSize: number = 24,
        scale: number = 1,
        rotation: number = 0
    ) {

        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.fontSize = fontSize;
        this.scale = scale;
        this.rotation = rotation;
        this.selected = false;

    }

    public getText(): string {

        return this.text;

    }

    public setText(text: string): void {

        this.text = text;

    }

    public getX(): number {

        return this.x;

    }

    public getY(): number {

        return this.y;

    }

    public setPosition(x: number, y: number): void {

        this.x = x;
        this.y = y;

    }

    public translate(deltaX: number, deltaY: number): void {

        this.x += deltaX;
        this.y += deltaY;

    }

    public getColor(): string {

        return this.color;

    }

    public setColor(color: string): void {

        this.color = color;

    }

    public getFontSize(): number {

        return this.fontSize;

    }

    public getScale(): number {

        return this.scale;

    }

    public setScale(scale: number): void {

        this.scale = Math.max(0.01, scale);

    }

    public getRotation(): number {

        return this.rotation;

    }

    public isSelected(): boolean {

        return this.selected;

    }

    public setSelected(selected: boolean): void {

        this.selected = selected;

    }

    public getBounds(measure: TextMeasure): SelectionBounds {

        const size = measure(this.text, this.fontSize);
        const halfHeight = size.height * this.scale / 2;

        return {
            minX: this.x,
            minY: this.y - halfHeight,
            maxX: this.x + size.width * this.scale,
            maxY: this.y + halfHeight
        };

    }

    public hitTest(x: number, y: number, bounds: SelectionBounds, padding: number = 0): boolean {

        return x >= bounds.minX - padding && x <= bounds.maxX + padding &&
            y >= bounds.minY - padding && y <= bounds.maxY + padding;

    }

}
