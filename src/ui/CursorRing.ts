// Kalem ucunun kapsadığı alanı imleçte gösteren içi boş halka.
// Hedef noktayı kapatmaz; merkezdeki nokta ince uçlarda nişan alır.
// Tuvalde yeniden çizim yapmaz; ucuz bir HTML katmandır.
export class CursorRing {

    private readonly element: HTMLDivElement;
    private readonly dot: HTMLDivElement;

    constructor() {

        this.element = document.createElement("div");
        this.element.className = "cursor-ring";
        this.element.hidden = true;

        this.dot = document.createElement("div");
        this.dot.className = "cursor-ring__dot";
        this.element.appendChild(this.dot);

        document.body.appendChild(this.element);

    }

    public setColor(color: string): void {

        const { r, g, b } = parseColor(color);
        this.element.style.borderColor = `rgb(${r} ${g} ${b} / 0.65)`;
        this.element.style.backgroundColor = `rgb(${r} ${g} ${b} / 0.07)`;
        this.dot.style.backgroundColor = `rgb(${r} ${g} ${b} / 0.9)`;

    }

    public show(clientX: number, clientY: number, screenDiameter: number): void {

        this.move(clientX, clientY, screenDiameter);

    }

    public move(clientX: number, clientY: number, screenDiameter: number): void {

        const diameter = Math.max(6, screenDiameter);
        this.element.style.width = `${diameter}px`;
        this.element.style.height = `${diameter}px`;
        this.element.style.left = `${clientX - diameter / 2}px`;
        this.element.style.top = `${clientY - diameter / 2}px`;
        this.element.hidden = false;

    }

    public hide(): void {

        this.element.hidden = true;

    }

    public destroy(): void {

        this.element.remove();

    }

}

function parseColor(color: string): { r: number; g: number; b: number } {

    const fallback = { r: 37, g: 99, b: 235 };
    const hex = color.trim().replace(/^#/, "");

    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16)
        };
    }

    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
        return {
            r: parseInt(hex[0] + hex[0], 16),
            g: parseInt(hex[1] + hex[1], 16),
            b: parseInt(hex[2] + hex[2], 16)
        };
    }

    return fallback;

}
