import { ToolManager } from "../core/ToolManager";
import { HistoryManager } from "../core/HistoryManager";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { ScreenCaptureTool } from "../tools/ScreenCaptureTool";
import { TextTool } from "../tools/TextTool";
import undoIcon from "../assets/icons/undo.svg";
import redoIcon from "../assets/icons/redo.svg";
import captureIcon from "../assets/icons/capture.svg";
import textIcon from "../assets/icons/text.svg";
import squareIcon from "../assets/icons/square.svg";
import gridIcon from "../assets/icons/grid.svg";
import rowsIcon from "../assets/icons/rows.svg";
import columnsIcon from "../assets/icons/columns.svg";
import type { GuideLineType } from "../renderers/DocumentRenderer";

export class ToolbarLeftPanel {

    constructor(
        toolManager: ToolManager,
        historyManager: HistoryManager,
        documentRenderer: DocumentRenderer,
        textTool: TextTool,
        screenCaptureTool: ScreenCaptureTool,
        desktopAvailable: boolean,
        canvas: HTMLCanvasElement
    ) {

        const panel = document.createElement("aside");
        panel.className = "toolbar-left-panel";
        panel.setAttribute("aria-label", "Araçlar (sol)");

        const list = document.createElement("div");
        list.className = "toolbar-left-panel__list";

        const undoButton = this.createIconButton("Geri Al", undoIcon, {
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
            ? this.createIconButton("Ekran Alıntısı", captureIcon, {
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

        const guideControl = document.createElement("div");
        guideControl.className = "sidebar__control";

        const guideButton = this.createIconButton("Kılavuz Çizgileri", squareIcon, {
            className: "sidebar__tool"
        });
        guideButton.setAttribute("aria-expanded", "false");
        guideControl.appendChild(guideButton);

        const guidePalette = document.createElement("div");
        guidePalette.className = "sidebar__flyout sidebar__guideline-palette";
        guidePalette.hidden = true;
        guidePalette.setAttribute("role", "group");
        guidePalette.setAttribute("aria-label", "Kılavuz çizgileri");
        document.body.appendChild(guidePalette);

        const guideOptions: Array<{ type: GuideLineType; label: string; icon: string }> = [
            { type: "none", label: "Çizgi Yok", icon: squareIcon },
            { type: "grid", label: "Kareli", icon: gridIcon },
            { type: "rows", label: "Yatay Çizgili", icon: rowsIcon },
            { type: "columns", label: "Dikey Çizgili", icon: columnsIcon }
        ];

        const selectGuideLines = (
            type: GuideLineType,
            selectedButton: HTMLButtonElement
        ): void => {
            documentRenderer.setGuideLines(type);
            documentRenderer.render();

            guideButton.replaceChildren();

            const icon = selectedButton.querySelector("img");

            if (icon) {
                const img = document.createElement("img");
                img.src = (icon as HTMLImageElement).src;
                img.alt = "";
                img.draggable = false;

                guideButton.appendChild(img);
            } else {
                guideButton.textContent = selectedButton.textContent ?? "";
            }

            guideButton.title = selectedButton.title;
            guideButton.setAttribute("aria-label", `Kılavuz Çizgileri: ${selectedButton.title}`);

            for (const button of guidePalette.querySelectorAll("button")) {
                const isSelected = button === selectedButton;

                button.classList.toggle("sidebar__guideline-option--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }

            guidePalette.hidden = true;
            guideButton.setAttribute("aria-expanded", "false");
        };

        let guideNoneButton: HTMLButtonElement | null = null;

        for (const option of guideOptions) {
            const guideOptionButton = this.createIconButton(option.label, option.icon, {
                className: "sidebar__guideline-option",
                isSelected: option.type === "none",
                selectedClass: "sidebar__guideline-option--selected",
                onSelect: () => {
                    selectGuideLines(option.type, guideOptionButton);
                }
            });

            if (option.type === "none") {
                guideNoneButton = guideOptionButton;
            }

            guidePalette.appendChild(guideOptionButton);
        }

        guideButton.addEventListener("click", () => {
            guidePalette.hidden = !guidePalette.hidden;
            guideButton.setAttribute("aria-expanded", String(!guidePalette.hidden));
        });

        document.addEventListener("pointerdown", (event) => {
            const target = event.target;

            if (!(target instanceof Node)) {
                return;
            }

            if (guideControl.contains(target) || guidePalette.contains(target)) {
                return;
            }

            guidePalette.hidden = true;
            guideButton.setAttribute("aria-expanded", "false");
        });

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
            ...(screenCaptureButton !== null ? [screenCaptureButton] : []),
            guideControl
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

        setPanelOpen(true);

        toggle.addEventListener("click", () => {
            setPanelOpen(document.body.classList.contains("toolbar-left-closed"));
        });

        canvas.addEventListener("pointerdown", () => {
            setPanelOpen(false);
        });

        window.addEventListener("newdraw:started", () => {
            if (guideNoneButton !== null) {
                selectGuideLines("none", guideNoneButton);
            }

            setPanelOpen(true);
        });

        window.addEventListener("drawing:opened", () => setPanelOpen(true));

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
