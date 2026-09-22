export class ViewportManager {

    private static readonly MIN_SCALE = 0.25;
    private static readonly MAX_SCALE = 4;

    private scale: number;
    private offsetX: number;
    private offsetY: number;
    private readonly listeners: Set<() => void>;

    constructor() {

        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.listeners = new Set();

    }

    public getScale(): number {

        return this.scale;

    }

    public getOffsetX(): number {

        return this.offsetX;

    }

    public getOffsetY(): number {

        return this.offsetY;

    }

    public screenToWorldX(screenX: number): number {

        return (screenX - this.offsetX) / this.scale;

    }

    public screenToWorldY(screenY: number): number {

        return (screenY - this.offsetY) / this.scale;

    }

    public worldToScreenX(worldX: number): number {

        return worldX * this.scale + this.offsetX;

    }

    public worldToScreenY(worldY: number): number {

        return worldY * this.scale + this.offsetY;

    }

    public zoomAt(screenX: number, screenY: number, factor: number): void {

        if (!Number.isFinite(factor) || factor <= 0) {
            return;
        }

        const newScale = Math.min(
            ViewportManager.MAX_SCALE,
            Math.max(ViewportManager.MIN_SCALE, this.scale * factor)
        );

        if (newScale === this.scale) {
            return;
        }

        const ratio = newScale / this.scale;
        this.offsetX = screenX - (screenX - this.offsetX) * ratio;
        this.offsetY = screenY - (screenY - this.offsetY) * ratio;
        this.scale = newScale;
        this.emit();

    }

    public panBy(deltaX: number, deltaY: number): void {

        if (deltaX === 0 && deltaY === 0) {
            return;
        }

        this.offsetX += deltaX;
        this.offsetY += deltaY;
        this.emit();

    }

    public reset(): void {

        if (this.scale === 1 && this.offsetX === 0 && this.offsetY === 0) {
            return;
        }

        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.emit();

    }

    public addChangeListener(listener: () => void): void {

        this.listeners.add(listener);

    }

    public removeChangeListener(listener: () => void): void {

        this.listeners.delete(listener);

    }

    private emit(): void {

        for (const listener of this.listeners) {
            listener();
        }

    }

}
