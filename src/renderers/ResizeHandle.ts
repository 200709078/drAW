export type ResizeHandle =
    | "topLeft"
    | "top"
    | "topRight"
    | "right"
    | "bottomRight"
    | "bottom"
    | "bottomLeft"
    | "left";

export const ALL_RESIZE_HANDLES: readonly ResizeHandle[] = [
    "topLeft",
    "top",
    "topRight",
    "right",
    "bottomRight",
    "bottom",
    "bottomLeft",
    "left"
];

export type SelectionBounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
};

export function getResizeHandlePosition(
    handle: ResizeHandle,
    bounds: SelectionBounds
): { x: number; y: number } {

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    switch (handle) {
        case "topLeft":
            return { x: bounds.minX, y: bounds.minY };
        case "top":
            return { x: centerX, y: bounds.minY };
        case "topRight":
            return { x: bounds.maxX, y: bounds.minY };
        case "right":
            return { x: bounds.maxX, y: centerY };
        case "bottomRight":
            return { x: bounds.maxX, y: bounds.maxY };
        case "bottom":
            return { x: centerX, y: bounds.maxY };
        case "bottomLeft":
            return { x: bounds.minX, y: bounds.maxY };
        case "left":
            return { x: bounds.minX, y: centerY };
    }

}

export function getResizeCursor(handle: ResizeHandle): string {

    switch (handle) {
        case "topLeft":
        case "bottomRight":
            return "nwse-resize";
        case "topRight":
        case "bottomLeft":
            return "nesw-resize";
        case "top":
        case "bottom":
            return "ns-resize";
        case "right":
        case "left":
            return "ew-resize";
    }

}
