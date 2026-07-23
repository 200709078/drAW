import { ToolManager } from "../core/ToolManager";
import { Document } from "../document/Document";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { EraserTool } from "../tools/EraserTool";
import { HighlighterTool } from "../tools/HighlighterTool";
import { SelectionTool } from "../tools/SelectionTool";
import { PenTool } from "../tools/PenTool";

export class Sidebar {

    constructor(
        toolManager: ToolManager,
        penTool: PenTool,
        eraserTool: EraserTool,
        highlighterTool: HighlighterTool,
        selectionTool: SelectionTool,
        drawingDocument: Document,
        documentRenderer: DocumentRenderer
    ) {

        const sidebar = document.createElement("aside");
        sidebar.className = "sidebar";
        sidebar.setAttribute("aria-label", "Araçlar");

        const toolbar = document.createElement("div");
        toolbar.className = "sidebar__toolbar";

        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "sidebar__handle";
        handle.setAttribute("aria-label", "Toolbar'ı taşı");
        handle.append("dr");

        const brandAccent = document.createElement("span");
        brandAccent.className = "sidebar__brand-accent";
        brandAccent.textContent = "AW";
        handle.appendChild(brandAccent);

        toolbar.appendChild(handle);

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        handle.addEventListener("pointerdown", (event) => {
            const toolbarBounds = sidebar.getBoundingClientRect();

            isDragging = true;
            offsetX = event.clientX - toolbarBounds.left;
            offsetY = event.clientY - toolbarBounds.top;
            handle.setPointerCapture(event.pointerId);
            event.preventDefault();
        });

        handle.addEventListener("pointermove", (event) => {
            if (!isDragging) {
                return;
            }

            const maximumLeft = Math.max(0, window.innerWidth - sidebar.offsetWidth);
            const maximumTop = Math.max(0, window.innerHeight - sidebar.offsetHeight);
            const left = Math.min(maximumLeft, Math.max(0, event.clientX - offsetX));
            const top = Math.min(maximumTop, Math.max(0, event.clientY - offsetY));

            sidebar.style.left = `${left}px`;
            sidebar.style.top = `${top}px`;
        });

        const stopDragging = (event: PointerEvent): void => {
            isDragging = false;

            if (handle.hasPointerCapture(event.pointerId)) {
                handle.releasePointerCapture(event.pointerId);
            }
        };

        handle.addEventListener("pointerup", stopDragging);
        handle.addEventListener("pointercancel", stopDragging);

        const penButton = this.createToolButton("Kalem", "✎", true, () => {
            toolManager.setTool(penTool);
        });
        const eraserButton = this.createToolButton("Silgi", "⌫", false, () => {
            toolManager.setTool(eraserTool);
        });
        const highlighterButton = this.createToolButton("Fosforlu kalem", "▰", false, () => {
            toolManager.setTool(highlighterTool);
        });
        const selectionButton = this.createToolButton("Seç ve taşı", "▣", false, () => {
            toolManager.setTool(selectionTool);
        });

        const selectTool = (selectedButton: HTMLButtonElement): void => {
            for (const button of [penButton, eraserButton, highlighterButton, selectionButton]) {
                const isSelected = button === selectedButton;

                button.classList.toggle("sidebar__tool--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }
        };

        penButton.addEventListener("click", () => selectTool(penButton));
        eraserButton.addEventListener("click", () => selectTool(eraserButton));
        highlighterButton.addEventListener("click", () => selectTool(highlighterButton));
        selectionButton.addEventListener("click", () => selectTool(selectionButton));

        const colorControl = document.createElement("div");
        colorControl.className = "sidebar__control";

        const colorButton = document.createElement("button");
        colorButton.type = "button";
        colorButton.className = "sidebar__color-trigger";
        colorButton.style.backgroundColor = "#111827";
        colorButton.setAttribute("aria-label", "Renk: Siyah");
        colorButton.setAttribute("aria-expanded", "false");

        const colorPalette = document.createElement("div");
        colorPalette.className = "sidebar__flyout sidebar__color-palette";
        colorPalette.hidden = true;
        colorPalette.setAttribute("role", "group");
        colorPalette.setAttribute("aria-label", "Kalem rengi");

        const widthControl = document.createElement("div");
        widthControl.className = "sidebar__control";

        const widthButton = document.createElement("button");
        widthButton.type = "button";
        widthButton.className = "sidebar__width-trigger";
        widthButton.style.setProperty("--line-width", "6px");
        widthButton.setAttribute("aria-label", "Kalınlık: 6 piksel");
        widthButton.setAttribute("aria-expanded", "false");

        const widthPalette = document.createElement("div");
        widthPalette.className = "sidebar__flyout sidebar__width-palette";
        widthPalette.hidden = true;
        widthPalette.setAttribute("role", "group");
        widthPalette.setAttribute("aria-label", "Kalem kalınlığı");

        const clearButton = document.createElement("button");
        clearButton.type = "button";
        clearButton.className = "sidebar__clear";
        clearButton.textContent = "×";
        clearButton.title = "Tümünü temizle";
        clearButton.setAttribute("aria-label", "Tümünü temizle");
        clearButton.addEventListener("click", () => {
            if (!window.confirm("Tüm çizimler silinsin mi?")) {
                return;
            }

            toolManager.getActiveTool()?.cancel();
            drawingDocument.clearCurrentPage();
            documentRenderer.render();
        });

        const flyouts = [
            { button: colorButton, panel: colorPalette },
            { button: widthButton, panel: widthPalette }
        ];

        const closeFlyouts = (): void => {
            for (const flyout of flyouts) {
                flyout.panel.hidden = true;
                flyout.button.setAttribute("aria-expanded", "false");
            }
        };

        const toggleFlyout = (button: HTMLButtonElement, panel: HTMLDivElement): void => {
            const shouldOpen = panel.hidden;

            closeFlyouts();

            panel.hidden = !shouldOpen;
            button.setAttribute("aria-expanded", String(shouldOpen));
        };

        colorButton.addEventListener("click", () => toggleFlyout(colorButton, colorPalette));
        widthButton.addEventListener("click", () => toggleFlyout(widthButton, widthPalette));
        document.addEventListener("pointerdown", (event) => {
            if (event.target instanceof HTMLCanvasElement) {
                closeFlyouts();
            }
        });

        const colors = [
            { name: "Siyah", value: "#111827" },
            { name: "Kırmızı", value: "#ef4444" },
            { name: "Turuncu", value: "#f97316" },
            { name: "Sarı", value: "#eab308" },
            { name: "Yeşil", value: "#22c55e" },
            { name: "Mavi", value: "#3b82f6" }
        ];

        for (const [index, color] of colors.entries()) {
            const paletteButton = document.createElement("button");
            const isSelected = index === 0;
            paletteButton.type = "button";
            paletteButton.className = "sidebar__color";
            paletteButton.style.backgroundColor = color.value;
            paletteButton.setAttribute("aria-label", color.name);
            paletteButton.setAttribute("aria-pressed", String(isSelected));
            paletteButton.classList.toggle("sidebar__color--selected", isSelected);

            paletteButton.addEventListener("click", () => {
                penTool.setColor(color.value);
                highlighterTool.setColor(color.value);
                colorButton.style.backgroundColor = color.value;
                colorButton.setAttribute("aria-label", `Renk: ${color.name}`);

                for (const button of colorPalette.querySelectorAll("button")) {
                    const isCurrentColor = button === paletteButton;

                    button.classList.toggle("sidebar__color--selected", isCurrentColor);
                    button.setAttribute("aria-pressed", String(isCurrentColor));
                }

                colorPalette.hidden = true;
                colorButton.setAttribute("aria-expanded", "false");
            });

            colorPalette.appendChild(paletteButton);
        }

        const lineWidths = [2, 4, 6, 10, 16, 24];

        for (const lineWidth of lineWidths) {
            const paletteButton = document.createElement("button");
            const isSelected = lineWidth === 6;

            paletteButton.type = "button";
            paletteButton.className = "sidebar__width";
            paletteButton.style.setProperty("--line-width", `${lineWidth}px`);
            paletteButton.setAttribute("aria-label", `${lineWidth} piksel kalınlık`);
            paletteButton.setAttribute("aria-pressed", String(isSelected));
            paletteButton.classList.toggle("sidebar__width--selected", isSelected);

            paletteButton.addEventListener("click", () => {
                penTool.setLineWidth(lineWidth);
                highlighterTool.setLineWidth(lineWidth);
                widthButton.style.setProperty("--line-width", `${lineWidth}px`);
                widthButton.setAttribute("aria-label", `Kalınlık: ${lineWidth} piksel`);

                for (const button of widthPalette.querySelectorAll("button")) {
                    const isCurrentWidth = button === paletteButton;

                    button.classList.toggle("sidebar__width--selected", isCurrentWidth);
                    button.setAttribute("aria-pressed", String(isCurrentWidth));
                }

                widthPalette.hidden = true;
                widthButton.setAttribute("aria-expanded", "false");
            });

            widthPalette.appendChild(paletteButton);
        }

        colorControl.append(colorButton, colorPalette);
        widthControl.append(widthButton, widthPalette);
        toolbar.append(
            penButton,
            eraserButton,
            highlighterButton,
            selectionButton,
            colorControl,
            widthControl,
            clearButton
        );
        sidebar.appendChild(toolbar);
        document.body.appendChild(sidebar);

    }

    private createToolButton(
        label: string,
        icon: string,
        isSelected: boolean,
        onSelect: () => void
    ): HTMLButtonElement {

        const button = document.createElement("button");
        button.type = "button";
        button.className = "sidebar__tool";
        button.textContent = icon;
        button.title = label;
        button.setAttribute("aria-label", label);
        button.setAttribute("aria-pressed", String(isSelected));
        button.classList.toggle("sidebar__tool--selected", isSelected);
        button.addEventListener("click", onSelect);

        return button;

    }

}
