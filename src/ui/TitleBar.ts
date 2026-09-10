export const TITLEBAR_HEIGHT = 36;

export function isCustomTitlebarActive(): boolean {
    return window.drAWDesktop?.windowControls !== undefined;
}

export function getTitlebarOffset(): number {
    return isCustomTitlebarActive() ? TITLEBAR_HEIGHT : 0;
}

const MINIMIZE_SVG = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"`,
    ` fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">`,
    `<path d="M1 6h10"/>`,
    `</svg>`
].join("");

const MAXIMIZE_SVG = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"`,
    ` fill="none" stroke="currentColor" stroke-width="1.2">`,
    `<rect x="1.5" y="1.5" width="9" height="9" rx="1"/>`,
    `</svg>`
].join("");

const RESTORE_SVG = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"`,
    ` fill="none" stroke="currentColor" stroke-width="1.2">`,
    `<rect x="3.5" y="3.5" width="7" height="7" rx="1"/>`,
    `<path d="M8.5 3.5v-1a1 1 0 0 0-1-1h-5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1"/>`,
    `</svg>`
].join("");

const CLOSE_SVG = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"`,
    ` fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">`,
    `<path d="M2 2l8 8"/>`,
    `<path d="M10 2l-8 8"/>`,
    `</svg>`
].join("");

export class TitleBar {

    private maximizeButton: HTMLButtonElement | null = null;

    constructor() {
        const controls = window.drAWDesktop?.windowControls;

        if (controls === undefined) {
            return;
        }

        document.body.classList.add("has-custom-titlebar");

        const bar = document.createElement("div");
        bar.className = "titlebar";

        const drag = document.createElement("div");
        drag.className = "titlebar__drag";
        drag.title = "mADEMatik | drAW";

        const icon = document.createElement("img");
        icon.className = "titlebar__icon";
        icon.src = "./app-icon.png";
        icon.alt = "";
        icon.draggable = false;

        const title = document.createElement("span");
        title.className = "titlebar__title";
        title.textContent = "mADEMatik | drAW";

        drag.appendChild(icon);
        drag.appendChild(title);
        drag.addEventListener("dblclick", () => {
            controls.toggleMaximize();
        });

        const buttons = document.createElement("div");
        buttons.className = "titlebar__controls";

        const minimizeButton = this.createButton("Küçült", MINIMIZE_SVG, "titlebar__button", () => {
            controls.minimize();
        });

        this.maximizeButton = this.createButton("Büyüt", MAXIMIZE_SVG, "titlebar__button", () => {
            controls.toggleMaximize();
        });

        const closeButton = this.createButton("Kapat", CLOSE_SVG, "titlebar__button titlebar__button--close", () => {
            controls.close();
        });

        buttons.appendChild(minimizeButton);
        buttons.appendChild(this.maximizeButton);
        buttons.appendChild(closeButton);

        bar.appendChild(drag);
        bar.appendChild(buttons);
        document.body.prepend(bar);

        controls.onMaximizeChanged((maximized) => {
            this.updateMaximizeButton(maximized);
        });
    }

    private createButton(label: string, svg: string, className: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.title = label;
        button.setAttribute("aria-label", label);
        button.innerHTML = svg;
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            onClick();
        });

        return button;
    }

    private updateMaximizeButton(maximized: boolean): void {
        if (this.maximizeButton === null) {
            return;
        }

        this.maximizeButton.innerHTML = maximized ? RESTORE_SVG : MAXIMIZE_SVG;
        this.maximizeButton.title = maximized ? "Geri yükle" : "Büyüt";
        this.maximizeButton.setAttribute("aria-label", maximized ? "Geri yükle" : "Büyüt");
    }
}
