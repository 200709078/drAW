import { Stroke } from "../document/Stroke";
import { DrawingContext } from "../models/DrawingContext";
import { Point } from "../document/Point";

export class StrokeRenderer {

    private readonly drawingContext: DrawingContext;

    constructor(
        drawingContext: DrawingContext
    ) {

        this.drawingContext = drawingContext;

    }

    public render(stroke: Stroke): void {

        const points = stroke.getPoints();

        if (points.length === 0) {
            return;
        }

        const context = this.drawingContext.getContext();

        const firstPoint = points[0];

        context.save();
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = stroke.getColor();
        context.globalAlpha = stroke.getOpacity();

        if (stroke.getOpacity() < 1) {
            this.renderTransparentStroke(context, stroke);
            context.restore();

            return;
        }

        if (points.length === 1) {
            context.beginPath();
            context.arc(
                firstPoint.getX(),
                firstPoint.getY(),
                this.getLineWidth(stroke, firstPoint) / 2,
                0,
                Math.PI * 2
            );
            context.fillStyle = context.strokeStyle;
            context.fill();
            context.restore();

            return;
        }

        if (points.length === 2) {
            this.drawLine(context, stroke, firstPoint, points[1]);
            context.restore();

            return;
        }

        let startPoint = firstPoint;

        for (let i = 1; i < points.length - 1; i++) {

            const point: Point = points[i];
            const nextPoint: Point = points[i + 1];
            const midpointX = (point.getX() + nextPoint.getX()) / 2;
            const midpointY = (point.getY() + nextPoint.getY()) / 2;

            context.beginPath();
            context.lineWidth = this.getLineWidth(stroke, point);
            context.moveTo(startPoint.getX(), startPoint.getY());
            context.quadraticCurveTo(point.getX(), point.getY(), midpointX, midpointY);
            context.stroke();

            startPoint = new Point(midpointX, midpointY, point.getPressure());

        }

        this.drawLine(context, stroke, startPoint, points[points.length - 1]);
        context.restore();

    }

    public renderSelection(stroke: Stroke): void {

        const points = stroke.getPoints();

        if (points.length === 0) {
            return;
        }

        const context = this.drawingContext.getContext();

        context.save();
        context.strokeStyle = "#2563eb";
        context.globalAlpha = 0.55;
        context.lineWidth = stroke.getLineWidth() + 8;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.setLineDash([6, 6]);
        context.beginPath();

        const firstPoint = points[0];

        if (points.length === 1) {
            context.arc(
                firstPoint.getX(),
                firstPoint.getY(),
                context.lineWidth / 2,
                0,
                Math.PI * 2
            );
        } else {
            context.moveTo(firstPoint.getX(), firstPoint.getY());

            for (let index = 1; index < points.length; index++) {
                const point = points[index];

                context.lineTo(point.getX(), point.getY());
            }
        }

        context.stroke();
        context.restore();

    }

    private drawLine(
        context: CanvasRenderingContext2D,
        stroke: Stroke,
        startPoint: Point,
        endPoint: Point
    ): void {

        context.beginPath();
        context.lineWidth = (
            this.getLineWidth(stroke, startPoint) + this.getLineWidth(stroke, endPoint)
        ) / 2;
        context.moveTo(startPoint.getX(), startPoint.getY());
        context.lineTo(endPoint.getX(), endPoint.getY());
        context.stroke();

    }

    private renderTransparentStroke(
        context: CanvasRenderingContext2D,
        stroke: Stroke
    ): void {

        const points = stroke.getPoints();
        const firstPoint = points[0];

        context.lineWidth = stroke.getLineWidth();

        if (points.length === 1) {
            context.beginPath();
            context.arc(
                firstPoint.getX(),
                firstPoint.getY(),
                stroke.getLineWidth() / 2,
                0,
                Math.PI * 2
            );
            context.fillStyle = context.strokeStyle;
            context.fill();

            return;
        }

        context.beginPath();
        context.moveTo(firstPoint.getX(), firstPoint.getY());

        if (points.length === 2) {
            const lastPoint = points[1];

            context.lineTo(lastPoint.getX(), lastPoint.getY());
        } else {
            for (let index = 1; index < points.length - 1; index++) {
                const point = points[index];
                const nextPoint = points[index + 1];
                const midpointX = (point.getX() + nextPoint.getX()) / 2;
                const midpointY = (point.getY() + nextPoint.getY()) / 2;

                context.quadraticCurveTo(point.getX(), point.getY(), midpointX, midpointY);
            }

            const lastPoint = points[points.length - 1];
            context.lineTo(lastPoint.getX(), lastPoint.getY());
        }

        context.stroke();

    }

    private getLineWidth(stroke: Stroke, point: Point): number {

        const pressure = Math.min(1, Math.max(0.1, point.getPressure()));

        return Math.max(0.5, stroke.getLineWidth() * pressure);

    }

}
