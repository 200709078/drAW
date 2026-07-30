import { Point } from "./Point";

export class Stroke {

    private readonly points: Point[];
    private readonly color: string;
    private readonly lineWidth: number;
    private readonly opacity: number;

    constructor(
        color: string = "#111827",
        lineWidth: number = 6,
        opacity: number = 1
    ) {

        this.points = [];
        this.color = color;
        this.lineWidth = lineWidth;
        this.opacity = opacity;

    }

    public addPoint(point: Point): void {

        this.points.push(point);

    }

    public getPoints(): readonly Point[] {

        return this.points;

    }

    public getColor(): string {

        return this.color;

    }

    public getLineWidth(): number {

        return this.lineWidth;

    }

    public getOpacity(): number {

        return this.opacity;

    }

    public translate(deltaX: number, deltaY: number): void {

        for (let index = 0; index < this.points.length; index++) {
            const point = this.points[index];

            this.points[index] = new Point(
                point.getX() + deltaX,
                point.getY() + deltaY,
                point.getPressure(),
                point.getTimestamp()
            );
        }

    }

}
