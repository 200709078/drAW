import type { ViewportManager } from "../core/ViewportManager";

const ZOOM_IN_SVG = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"`,
    ` fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
    `<circle cx="11" cy="11" r="8"/>`,
    `<path d="m21 21-4.3-4.3"/>`,
    `<path d="M11 8v6"/>`,
    `<path d="M8 11h6"/>`,
    `</svg>`
].join("");

const ZOOM_OUT_SVG = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"`,
    ` fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
    `<circle cx="11" cy="11" r="8"/>`,
    `<path d="m21 21-4.3-4.3"/>`,
    `<path d="M8 11h6"/>`,
    `</svg>`
].join("");

export class ZoomControls {

    private readonly viewport: ViewportManager;
    private readonly label: HTMLButtonElement;
    private readonly zoomInButton: HTMLButtonElement;
    private readonly zoomOutButton: HTMLButtonElement;

    constructor(viewport: ViewportManager) {

        this.viewport = viewport;

        const container = document.createElement("div");
        container.className = "zoom-controls";
        container.setAttribute("aria-label", "Yakınlaştırma");

        const zoomOut = this.createButton("Uzaklaş", () => {
            this.viewport.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 0.8);
        });
        zoomOut.innerHTML = ZOOM_OUT_SVG;
        this.zoomOutButton = zoomOut;

        this.label = this.createButton("Yakınlaştırmayı sıfırla", () => {
            this.viewport.reset();
        });
        this.label.classList.add("zoom-controls__label");

        const zoomIn = this.createButton("Yakınlaş", () => {
            this.viewport.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.25);
        });
        zoomIn.innerHTML = ZOOM_IN_SVG;
        this.zoomInButton = zoomIn;

        container.append(zoomOut, this.label, zoomIn);
        document.body.appendChild(container);

        this.viewport.addChangeListener(this.refresh);
        this.refresh();

    }

    private createButton(label: string, onClick: () => void): HTMLButtonElement {

        const button = document.createElement("button");
        button.type = "button";
        button.title = label;
        button.setAttribute("aria-label", label);
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            onClick();
        });

        return button;

    }

    private readonly refresh = (): void => {

        this.label.textContent = `${Math.round(this.viewport.getScale() * 100)}%`;
        this.zoomInButton.disabled = this.viewport.isAtMaxScale();
        this.zoomOutButton.disabled = this.viewport.isAtMinScale();

    };

}
