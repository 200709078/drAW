import type { ViewportManager } from "../core/ViewportManager";

export class ZoomControls {

    private readonly viewport: ViewportManager;
    private readonly label: HTMLButtonElement;

    constructor(viewport: ViewportManager) {

        this.viewport = viewport;

        const container = document.createElement("div");
        container.className = "zoom-controls";
        container.setAttribute("aria-label", "Yakınlaştırma");

        const zoomOut = this.createButton("Uzaklaş", "−", () => {
            this.viewport.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 0.8);
        });

        this.label = this.createButton("Yakınlaştırmayı sıfırla", "100%", () => {
            this.viewport.reset();
        });
        this.label.classList.add("zoom-controls__label");

        const zoomIn = this.createButton("Yakınlaş", "+", () => {
            this.viewport.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.25);
        });

        container.append(zoomOut, this.label, zoomIn);
        document.body.appendChild(container);

        this.viewport.addChangeListener(this.refresh);
        this.refresh();

    }

    private createButton(label: string, text: string, onClick: () => void): HTMLButtonElement {

        const button = document.createElement("button");
        button.type = "button";
        button.title = label;
        button.setAttribute("aria-label", label);
        button.textContent = text;
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            onClick();
        });

        return button;

    }

    private readonly refresh = (): void => {

        this.label.textContent = `${Math.round(this.viewport.getScale() * 100)}%`;

    };

}
