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

const FULLSCREEN_ENTER_SVG = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"`,
    ` fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="M8 3H5a2 2 0 0 0-2 2v3"/>`,
    `<path d="M21 8V5a2 2 0 0 0-2-2h-3"/>`,
    `<path d="M3 16v3a2 2 0 0 0 2 2h3"/>`,
    `<path d="M16 21h3a2 2 0 0 0 2-2v-3"/>`,
    `</svg>`
].join("");

const FULLSCREEN_EXIT_SVG = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"`,
    ` fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="M8 3v3a2 2 0 0 1-2 2H3"/>`,
    `<path d="M21 8h-3a2 2 0 0 1-2-2V3"/>`,
    `<path d="M3 16h3a2 2 0 0 1 2 2v3"/>`,
    `<path d="M16 21v-3a2 2 0 0 1 2-2h3"/>`,
    `</svg>`
].join("");

export class TitleBar {

    private maximizeButton: HTMLButtonElement | null = null;
    private fullscreenButton: HTMLButtonElement | null = null;
    private isFullscreen = false;

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

        this.fullscreenButton = this.createButton("Tam Ekran", FULLSCREEN_ENTER_SVG, "titlebar__button", () => {
            controls.toggleFullscreen();
        });

        const closeButton = this.createButton("Kapat", CLOSE_SVG, "titlebar__button titlebar__button--close", () => {
            controls.close();
        });

        buttons.appendChild(minimizeButton);
        buttons.appendChild(this.maximizeButton);
        buttons.appendChild(this.fullscreenButton);
        buttons.appendChild(closeButton);

        bar.appendChild(drag);
        bar.appendChild(buttons);
        document.body.prepend(bar);

        controls.onMaximizeChanged((maximized) => {
            this.updateMaximizeButton(maximized);
        });

        controls.onFullscreenChanged((fullscreen) => {
            this.updateFullscreenButton(fullscreen);
        });

        // Açılışta fullscreen ile başlanmışsa butonu senkronla
        void controls.isFullscreen().then((fullscreen) => {
            this.updateFullscreenButton(fullscreen);
        }).catch(() => undefined);

        // F11 main process'te ele alınıyor (çift toggle olmaması için burada ele alma).
        // ESC ile tam ekrandan çıkış:
        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.isFullscreen) {
                controls.setFullscreen(false);
            }
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

    private updateFullscreenButton(fullscreen: boolean): void {
        this.isFullscreen = fullscreen;
        document.body.classList.toggle("is-fullscreen", fullscreen);

        if (this.fullscreenButton === null) {
            return;
        }

        this.fullscreenButton.innerHTML = fullscreen ? FULLSCREEN_EXIT_SVG : FULLSCREEN_ENTER_SVG;
        this.fullscreenButton.title = fullscreen ? "Tam Ekrandan Çık" : "Tam Ekran";
        this.fullscreenButton.setAttribute("aria-label", fullscreen ? "Tam Ekrandan Çık" : "Tam Ekran");
    }
}
