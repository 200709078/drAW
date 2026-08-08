import { Point } from "../document/Point";

export type ShapeType = "rectangle" | "ellipse" | "triangle" | "line";

export type ShapeBounds = {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
};

export type ShapePointFactory = (bounds: ShapeBounds) => readonly Point[];

const SHAPE_POINT_FACTORIES: Record<ShapeType, ShapePointFactory> = {
    rectangle: createRectanglePoints,
    ellipse: createEllipsePoints,
    triangle: createTrianglePoints,
    line: createLinePoints
};

export function getShapePointFactory(type: ShapeType): ShapePointFactory {

    return SHAPE_POINT_FACTORIES[type];

}

function createRectanglePoints(bounds: ShapeBounds): readonly Point[] {

    const minX = Math.min(bounds.startX, bounds.endX);
    const maxX = Math.max(bounds.startX, bounds.endX);
    const minY = Math.min(bounds.startY, bounds.endY);
    const maxY = Math.max(bounds.startY, bounds.endY);

    return [
        new Point(minX, minY),
        new Point(maxX, minY),
        new Point(maxX, maxY),
        new Point(minX, maxY),
        new Point(minX, minY)
    ];

}

function createEllipsePoints(bounds: ShapeBounds): readonly Point[] {

    const centerX = (bounds.startX + bounds.endX) / 2;
    const centerY = (bounds.startY + bounds.endY) / 2;
    const radiusX = Math.abs(bounds.endX - bounds.startX) / 2;
    const radiusY = Math.abs(bounds.endY - bounds.startY) / 2;
    const radius = Math.max(radiusX, radiusY);
    const segments = 96;
    const points: Point[] = [];

    for (let index = 0; index < segments; index++) {
        const angle = index / segments * Math.PI * 2;

        points.push(new Point(
            centerX + radius * Math.cos(angle),
            centerY + radius * Math.sin(angle)
        ));
    }

    points.push(points[0]);

    return points;

}

function createTrianglePoints(bounds: ShapeBounds): readonly Point[] {

    const minX = Math.min(bounds.startX, bounds.endX);
    const maxX = Math.max(bounds.startX, bounds.endX);
    const minY = Math.min(bounds.startY, bounds.endY);
    const maxY = Math.max(bounds.startY, bounds.endY);
    const apexX = (minX + maxX) / 2;

    return [
        new Point(apexX, minY),
        new Point(maxX, maxY),
        new Point(minX, maxY),
        new Point(apexX, minY)
    ];

}

function createLinePoints(bounds: ShapeBounds): readonly Point[] {

    return [
        new Point(bounds.startX, bounds.startY),
        new Point(bounds.endX, bounds.endY)
    ];

}
