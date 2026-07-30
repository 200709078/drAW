export class DocumentImage {

    private readonly dataUrl: string;
    private x: number;
    private y: number;
    private readonly width: number;
    private readonly height: number;

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

    public translate(deltaX: number, deltaY: number): void {

        this.x += deltaX;
        this.y += deltaY;

    }

}
