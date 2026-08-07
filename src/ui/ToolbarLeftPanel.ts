import { ToolManager } from "../core/ToolManager";
import { HistoryManager } from "../core/HistoryManager";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { ScreenCaptureTool } from "../tools/ScreenCaptureTool";
import { TextTool } from "../tools/TextTool";
import type { Tool } from "../tools/Tool";
import undoIcon from "../assets/icons/undo.svg";
import redoIcon from "../assets/icons/redo.svg";
import captureIcon from "../assets/icons/capture.svg";
import textIcon from "../assets/icons/text.svg";

export class ToolbarLeftPanel {

    constructor(
        toolManager: ToolManager,
        historyManager: HistoryManager,
        documentRenderer: DocumentRenderer,
        textTool: TextTool,
        screenCaptureTool: ScreenCaptureTool,
        desktopAvailable: boolean,
        canvas: HTMLCanvasElement,
        drawingTools: ReadonlyArray<Tool>
    ) {

        const panel = document.createElement("aside");
        panel.className = "toolbar-left-panel";
        panel.setAttribute("aria-label", "Araçlar (sol)");

        const list = document.createElement("div");
        list.className = "toolbar-left-panel__list";

        const undoButton = this.createIconButton("Geri al", undoIcon, {
            className: "sidebar__history"
        });

        const redoButton = this.createIconButton("Yinele", redoIcon, {
            className: "sidebar__history"
        });

        const refreshHistoryButtons = (): void => {
            undoButton.disabled = !historyManager.canUndo();
            redoButton.disabled = !historyManager.canRedo();
        };

        const restoreHistory = (action: () => boolean): void => {
            toolManager.getActiveTool()?.cancel();

            if (!action()) {
                return;
            }

            documentRenderer.clearSelection();
            documentRenderer.render();
        };

        undoButton.addEventListener("click", () => restoreHistory(() => historyManager.undo()));
        redoButton.addEventListener("click", () => restoreHistory(() => historyManager.redo()));
        historyManager.addChangeListener(refreshHistoryButtons);
        refreshHistoryButtons();

        const textButton = this.createIconButton("Metin", textIcon, {
            className: "sidebar__tool",
            isSelected: false,
            selectedClass: "sidebar__tool--selected",
            onSelect: () => {
                toolManager.setTool(textTool);
            }
        });

        const screenCaptureButton = desktopAvailable
            ? this.createIconButton("Ekran alıntısı", captureIcon, {
                className: "sidebar__tool",
                isSelected: false,
                selectedClass: "sidebar__tool--selected",
                onSelect: () => {
                    toolManager.setTool(screenCaptureTool);
                }
            })
            : null;

        const toolButtons: HTMLButtonElement[] = [textButton];

        if (screenCaptureButton !== null) {
            toolButtons.push(screenCaptureButton);
        }

        const selectTool = (selectedButton: HTMLButtonElement): void => {
            for (const button of toolButtons) {
                const isSelected = button === selectedButton;

                button.classList.toggle("sidebar__tool--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }
        };

        textButton.addEventListener("click", () => selectTool(textButton));

        if (screenCaptureButton !== null) {
            screenCaptureButton.addEventListener("click", () => selectTool(screenCaptureButton));
        }

        toolManager.addChangeListener(() => {
            const activeTool = toolManager.getActiveTool();

            for (const button of toolButtons) {
                const isSelected =
                    (button === textButton && activeTool === textTool) ||
                    (screenCaptureButton !== null &&
                        button === screenCaptureButton &&
                        activeTool === screenCaptureTool);

                button.classList.toggle("sidebar__tool--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }
        });

        document.addEventListener("keydown", (event) => {
            if (!event.ctrlKey && !event.metaKey) {
                return;
            }

            const key = event.key.toLowerCase();
            const isRedo = key === "y" || (key === "z" && event.shiftKey);
            const isUndo = key === "z" && !event.shiftKey;

            if (!isUndo && !isRedo) {
                return;
            }

            event.preventDefault();
            restoreHistory(isRedo ? () => historyManager.redo() : () => historyManager.undo());
        });

        list.append(
            undoButton,
            redoButton,
            textButton,
            ...(screenCaptureButton !== null ? [screenCaptureButton] : [])
        );
        panel.appendChild(list);
        document.body.appendChild(panel);

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "toolbar-left-panel__toggle";
        toggle.setAttribute("aria-label", "Araç çubuğunu kapat");
        toggle.setAttribute("aria-expanded", "true");
        toggle.innerHTML = [
            `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"`,
            ` stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
            `<path d="m15 18-6-6 6-6"/>`,
            `</svg>`
        ].join("");
        document.body.appendChild(toggle);

        const updateToggleLeft = (): void => {
            if (document.body.classList.contains("toolbar-left-closed")) {
                return;
            }

            const rect = panel.getBoundingClientRect();
            document.documentElement.style.setProperty(
                "--toolbar-left-toggle-left",
                `${rect.right}px`
            );
        };

        updateToggleLeft();
        window.addEventListener("resize", updateToggleLeft);

        const setPanelOpen = (isOpen: boolean): void => {
            document.body.classList.toggle("toolbar-left-closed", !isOpen);
            toggle.setAttribute("aria-expanded", String(isOpen));
            toggle.setAttribute(
                "aria-label",
                isOpen ? "Araç çubuğunu kapat" : "Araç çubuğunu aç"
            );
        };

        setPanelOpen(false);

        toggle.addEventListener("click", () => {
            setPanelOpen(document.body.classList.contains("toolbar-left-closed"));
        });

        canvas.addEventListener("pointerdown", () => {
            const activeTool = toolManager.getActiveTool();

            if (activeTool !== null && drawingTools.includes(activeTool)) {
                setPanelOpen(false);
            }
        });

    }

    private createIconButton(
        label: string,
        icon: string,
        options: {
            className: string;
            isSelected?: boolean;
            selectedClass?: string;
            onSelect?: () => void;
        }
    ): HTMLButtonElement {
        const button = document.createElement("button");
        button.type = "button";
        button.className = options.className;

        const img = document.createElement("img");
        img.src = icon;
        img.alt = "";
        img.draggable = false;
        button.appendChild(img);

        button.title = label;
        button.setAttribute("aria-label", label);

        if (options.isSelected !== undefined) {
            button.setAttribute("aria-pressed", String(options.isSelected));
        }

        if (options.selectedClass !== undefined) {
            button.classList.toggle(options.selectedClass, options.isSelected === true);
        }

        if (options.onSelect !== undefined) {
            button.addEventListener("click", options.onSelect);
        }

        return button;
    }

}
