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

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// Ölçü IHDR başlığından okunur; doğrulama için görüntüyü yeniden açmak gerekmez.
export function pngSize(png: Uint8Array): { width: number; height: number } | null {
    if (png.length < 24 || PNG_SIGNATURE.some((byte, i) => png[i] !== byte) ||
        String.fromCharCode(...png.subarray(12, 16)) !== "IHDR") return null;
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    return width > 0 && height > 0 ? { width, height } : null;
}
