export type PixelRect = { x: number; y: number; width: number; height: number };

// Overlay yalnızca 0..1 aralığında koordinat yollar. Kaynak görüntü ölçüsü otoritedir.
export function pixelSelection(value: unknown, width: number, height: number): PixelRect | null {
    if (!value || typeof value !== "object") return null;
    const { left, top, right, bottom } = value as Record<string, unknown>;
    const values = [left, top, right, bottom];
    if (!values.every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1)) return null;
    const x = Math.round(Number(left) * width);
    const y = Math.round(Number(top) * height);
    const endX = Math.round(Number(right) * width);
    const endY = Math.round(Number(bottom) * height);
    if (endX <= x || endY <= y) return null;
    return { x, y, width: endX - x, height: endY - y };
}
