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

type Bounds = { x: number; y: number; width: number; height: number };
type ScreenInfo = { bounds: Bounds; scaleFactor: number };

// Bazı Linux/X11 kurulumlarında birden çok ekran için tek bir "bütün masaüstü" kaynağı gelir.
// Ekranların birleşimi (fiziksel piksel) ve drAW'ın ekranının onun içindeki yeri; ölçekler farklıysa
// ya da birleşim tek ekrandan büyük değilse (tek ekran, yansıtma) belirsizdir: null.
export function desktopCrop(display: ScreenInfo, displays: readonly ScreenInfo[]): { size: { width: number; height: number }; crop: PixelRect } | null {
    if (displays.length < 2 || displays.some((item) => item.scaleFactor !== display.scaleFactor)) return null;
    const scale = display.scaleFactor;
    const left = Math.min(...displays.map((item) => item.bounds.x));
    const top = Math.min(...displays.map((item) => item.bounds.y));
    const right = Math.max(...displays.map((item) => item.bounds.x + item.bounds.width));
    const bottom = Math.max(...displays.map((item) => item.bounds.y + item.bounds.height));
    const { x, y, width, height } = display.bounds;
    if (right - left <= width && bottom - top <= height) return null;
    return {
        size: { width: Math.round((right - left) * scale), height: Math.round((bottom - top) * scale) },
        crop: { x: Math.round((x - left) * scale), y: Math.round((y - top) * scale),
            width: Math.round(width * scale), height: Math.round(height * scale) }
    };
}

// Aynı en-boy oranı (küçültülmüş bir kopya da olabilir): birkaç piksellik yuvarlama payıyla.
export function sameAspect(a: { width: number; height: number }, b: { width: number; height: number }): boolean {
    return a.width > 0 && a.height > 0 && Math.abs(a.width * b.height - a.height * b.width) <= 2 * Math.max(b.width, b.height);
}
