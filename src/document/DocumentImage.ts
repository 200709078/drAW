export class DocumentImage {

    private readonly dataUrl: string;
    private x: number;
    private y: number;
    private width: number;
    private height: number;

    constructor(dataUrl: string, x: number, y: number, width: number, height: number) {

        this.dataUrl = dataUrl;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

    }

    public getDataUrl(): string {

        return this.dataUrl;

    }

    public getX(): number {

        return this.x;

    }

    public getY(): number {

        return this.y;

    }

    public getWidth(): number {

        return this.width;

    }

    public getHeight(): number {

        return this.height;

    }

    public setGeometry(x: number, y: number, width: number, height: number): void {

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

    }

    public hitTest(x: number, y: number, padding: number = 0): boolean {

        return x >= this.x - padding && x <= this.x + this.width + padding &&
            y >= this.y - padding && y <= this.y + this.height + padding;

    }

    public translate(deltaX: number, deltaY: number): void {

        this.x += deltaX;
        this.y += deltaY;

    }

}
