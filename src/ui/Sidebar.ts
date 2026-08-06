import { ToolManager } from "../core/ToolManager";
import { Document } from "../document/Document";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { EraserTool } from "../tools/EraserTool";
import { HighlighterTool } from "../tools/HighlighterTool";
import { SelectionTool } from "../tools/SelectionTool";
import { PenTool } from "../tools/PenTool";
import { PartialEraserTool } from "../tools/PartialEraserTool";
import { HistoryManager } from "../core/HistoryManager";
import { ScreenCaptureTool } from "../tools/ScreenCaptureTool";
import pencilIcon from "../assets/icons/pencil.svg";
import highlighterIcon from "../assets/icons/highlighter.svg";
import eraserNormalIcon from "../assets/icons/eraser_normal.svg";
import eraserStrokeIcon from "../assets/icons/eraser_stroke.svg";
import selectMoveIcon from "../assets/icons/select_move.svg";
import captureIcon from "../assets/icons/capture.svg";
import undoIcon from "../assets/icons/undo.svg";
import redoIcon from "../assets/icons/redo.svg";
import newDrawIcon from "../assets/icons/newdraw.svg";
import { confirmDialog } from "./ConfirmDialog";

export class Sidebar {

    constructor(
        toolManager: ToolManager,
        penTool: PenTool,
        eraserTool: EraserTool,
        highlighterTool: HighlighterTool,
        selectionTool: SelectionTool,
        partialEraserTool: PartialEraserTool,
        drawingDocument: Document,
        documentRenderer: DocumentRenderer,
        historyManager: HistoryManager,
        screenCaptureTool: ScreenCaptureTool
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

        const penButton = this.createIconButton("Kalem", pencilIcon, {
            className: "sidebar__tool",
            isSelected: true,
            selectedClass: "sidebar__tool--selected"
        });
        const eraserButton = this.createIconButton("Silgi", eraserNormalIcon, {
            className: "sidebar__tool",
            isSelected: false,
            selectedClass: "sidebar__tool--selected"
        });

        const highlighterButton = this.createIconButton("Fosforlu kalem", highlighterIcon, {
            className: "sidebar__pen-option",
            isSelected: false,
            onSelect: () => {
                selectPen(highlighterTool, highlighterButton);
            }
        });
        const selectionButton = this.createIconButton("Çoklu seç ve taşı", selectMoveIcon, {
            className: "sidebar__tool",
            isSelected: false,
            selectedClass: "sidebar__tool--selected",
            onSelect: () => {
                toolManager.setTool(selectionTool);
            }
        });
        const screenCaptureButton = this.createIconButton("Ekran alıntısı", captureIcon, {
            className: "sidebar__tool",
            isSelected: false,
            selectedClass: "sidebar__tool--selected",
            onSelect: () => {
                toolManager.setTool(screenCaptureTool);
            }
        });

        const selectTool = (selectedButton: HTMLButtonElement): void => {
            for (const button of [penButton, eraserButton, selectionButton, screenCaptureButton]) {
                const isSelected = button === selectedButton;

                button.classList.toggle("sidebar__tool--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }
        };

        selectionButton.addEventListener("click", () => selectTool(selectionButton));
        screenCaptureButton.addEventListener("click", () => selectTool(screenCaptureButton));

        const penControl = document.createElement("div");
        penControl.className = "sidebar__control";

        const penPalette = document.createElement("div");
        penPalette.className = "sidebar__flyout sidebar__pen-palette";
        penPalette.hidden = true;
        penPalette.setAttribute("role", "group");
        penPalette.setAttribute("aria-label", "Kalem türü");
        penButton.setAttribute("aria-expanded", "false");
        penControl.append(penButton, penPalette);

        const eraserControl = document.createElement("div");
        eraserControl.className = "sidebar__control";

        const eraserPalette = document.createElement("div");
        eraserPalette.className = "sidebar__flyout sidebar__eraser-palette";
        eraserPalette.hidden = true;
        eraserPalette.setAttribute("role", "group");
        eraserPalette.setAttribute("aria-label", "Silgi türü");
        eraserButton.setAttribute("aria-expanded", "false");
        eraserControl.append(eraserButton, eraserPalette);

        const colorControl = document.createElement("div");
        colorControl.className = "sidebar__control";

        const colorButton = document.createElement("button");
        colorButton.type = "button";
        colorButton.className = "sidebar__color-trigger";


        const colorPreview = document.createElement("span");
        colorPreview.className = "sidebar__color-preview";
        colorPreview.style.backgroundColor = "#111827";

        colorButton.appendChild(colorPreview);


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

        const newDrawButton = this.createIconButton("Yeni çizim", newDrawIcon, {
            className: "sidebar__history"
        });
        newDrawButton.addEventListener("click", async () => {
            const confirmed = await confirmDialog({
                title: "Yeni çizim",
                message: "Yeni bir çizime geçilsin mi? Mevcut çizimler silinecek.",
                confirmLabel: "Evet, başla",
                cancelLabel: "İptal"
            });

            if (!confirmed) {
                return;
            }

            toolManager.getActiveTool()?.cancel();
            drawingDocument.clearCurrentPage();
            historyManager.reset();
            documentRenderer.render();

            penTool.setColor("#111827");
            highlighterTool.setColor("#111827");
            penTool.setLineWidth(6);
            highlighterTool.setLineWidth(6);
            eraserTool.setLineWidth(6);
            partialEraserTool.setLineWidth(6);
            colorPreview.style.backgroundColor = "#111827";
            colorButton.setAttribute("aria-label", "Renk: Siyah");
            widthButton.style.setProperty("--line-width", "6px");
            widthButton.setAttribute("aria-label", "Kalınlık: 6 piksel");

            for (const [index, button] of colorPalette.querySelectorAll("button").entries()) {
                const isSelected = index === 0;

                button.classList.toggle("sidebar__color--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }

            for (const [index, button] of widthPalette.querySelectorAll("button").entries()) {
                const isSelected = index === 3;

                button.classList.toggle("sidebar__width--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }



            selectEraser(eraserTool, strokeEraserButton);
            selectPen(penTool, normalPenButton);
        });

        const flyouts = [
            { button: penButton, panel: penPalette },
            { button: eraserButton, panel: eraserPalette },
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

            if (shouldOpen) {
                const buttonBounds = button.getBoundingClientRect();

                panel.style.left = `${window.innerWidth / 2}px`;
                panel.style.top = `${buttonBounds.top - 16}px`;
            }

            panel.hidden = !shouldOpen;
            button.setAttribute("aria-expanded", String(shouldOpen));
        };

        colorButton.addEventListener("click", () => toggleFlyout(colorButton, colorPalette));
        widthButton.addEventListener("click", () => toggleFlyout(widthButton, widthPalette));

        let lastSelectedEraserTool: EraserTool | PartialEraserTool = eraserTool;
        let lastSelectedEraserButton: HTMLButtonElement | null = null;

        const selectEraser = (
            tool: EraserTool | PartialEraserTool,
            selectedButton: HTMLButtonElement
        ): void => {
            closeFlyouts();
            toolManager.setTool(tool);
            lastSelectedEraserTool = tool;
            lastSelectedEraserButton = selectedButton;
            selectTool(eraserButton);


            eraserButton.replaceChildren();

            const icon = selectedButton.querySelector("img");

            if (icon) {
                const img = document.createElement("img");
                img.src = (icon as HTMLImageElement).src;
                img.alt = "";
                img.draggable = false;

                eraserButton.appendChild(img);
            } else {
                eraserButton.textContent = selectedButton.textContent ?? "";
            }


            eraserButton.title = `Silgi: ${selectedButton.title}`;
            eraserButton.setAttribute("aria-label", `Silgi: ${selectedButton.title}`);

            for (const button of eraserPalette.querySelectorAll("button")) {
                const isSelected = button === selectedButton;

                button.classList.toggle("sidebar__eraser-option--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }

            eraserPalette.hidden = true;
            eraserButton.setAttribute("aria-expanded", "false");
        };

        let lastSelectedPenTool: PenTool | HighlighterTool = penTool;
        let lastSelectedPenButton: HTMLButtonElement | null = null;

        const updatePenButton = (selectedButton: HTMLButtonElement): void => {
            penButton.replaceChildren();

            const icon = selectedButton.querySelector("img");

            if (icon) {
                const img = document.createElement("img");
                img.src = (icon as HTMLImageElement).src;
                img.alt = "";
                img.draggable = false;

                penButton.appendChild(img);
            } else {
                penButton.textContent = selectedButton.textContent ?? "";
            }

            penButton.title = `Kalem: ${selectedButton.title}`;
            penButton.setAttribute("aria-label", `Kalem: ${selectedButton.title}`);

            for (const button of penPalette.querySelectorAll("button")) {
                const isSelected = button === selectedButton;

                button.classList.toggle("sidebar__pen-option--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }

            penPalette.hidden = true;
            penButton.setAttribute("aria-expanded", "false");
        };

        const selectPen = (
            tool: PenTool | HighlighterTool,
            selectedButton: HTMLButtonElement
        ): void => {
            closeFlyouts();
            toolManager.setTool(tool);
            lastSelectedPenTool = tool;
            lastSelectedPenButton = selectedButton;
            selectTool(penButton);
            updatePenButton(selectedButton);
        };

        const highlightPen = (selectedButton: HTMLButtonElement): void => {
            selectTool(penButton);
            updatePenButton(selectedButton);
        };

        const normalPenButton = this.createIconButton("Normal kalem", pencilIcon, {
            className: "sidebar__pen-option",
            isSelected: true,
            selectedClass: "sidebar__pen-option--selected",
            onSelect: () => {
                selectPen(penTool, normalPenButton);
            }
        });
        lastSelectedPenButton = normalPenButton;


        penButton.replaceChildren();

        const initialImg = normalPenButton.querySelector("img");

        if (initialImg) {
            const img = document.createElement("img");
            img.src = (initialImg as HTMLImageElement).src;
            img.alt = "";
            img.draggable = false;
            penButton.appendChild(img);
        }


        penButton.title = `Kalem: ${normalPenButton.title}`;
        penButton.setAttribute("aria-label", `Kalem: ${normalPenButton.title}`);
        penPalette.append(normalPenButton, highlighterButton);

        penButton.addEventListener("click", () => {
            const activeTool = toolManager.getActiveTool();

            if (activeTool === penTool || activeTool === highlighterTool) {
                toggleFlyout(penButton, penPalette);
                return;
            }

            if (lastSelectedPenButton !== null) {
                selectPen(lastSelectedPenTool, lastSelectedPenButton);
            }
        });

        toolManager.addChangeListener(() => {
            const activeTool = toolManager.getActiveTool();

            if (activeTool === penTool) {
                highlightPen(normalPenButton);
            } else if (activeTool === highlighterTool) {
                highlightPen(highlighterButton);
            } else if (activeTool === selectionTool) {
                selectTool(selectionButton);
            }
        });

        const strokeEraserButton = this.createIconButton("Stroke Sil", eraserStrokeIcon, {
            className: "sidebar__eraser-option",
            isSelected: false,
            onSelect: () => {
                selectEraser(eraserTool, strokeEraserButton);
            }
        });
        const partialEraserButton = this.createIconButton("Normal Silgi", eraserNormalIcon, {
            className: "sidebar__eraser-option",
            isSelected: false,
            onSelect: () => {
                selectEraser(partialEraserTool, partialEraserButton);
            }
        });
        lastSelectedEraserButton = strokeEraserButton;
        eraserPalette.append(strokeEraserButton, partialEraserButton);

        eraserButton.addEventListener("click", () => {
            const activeTool = toolManager.getActiveTool();

            if (activeTool === eraserTool || activeTool === partialEraserTool) {
                toggleFlyout(eraserButton, eraserPalette);
                return;
            }

            if (lastSelectedEraserButton !== null) {
                selectEraser(lastSelectedEraserTool, lastSelectedEraserButton);
            }
        });

        document.addEventListener("pointerdown", (event) => {
            const target = event.target;

            if (!(target instanceof Node)) {
                return;
            }

            const isFlyoutInteraction = flyouts.some(({ button, panel }) => {
                return button.contains(target) || panel.contains(target);
            });

            if (!isFlyoutInteraction) {
                closeFlyouts();
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

        const colors = [
            { name: "Siyah", value: "#111827" },
            { name: "Kırmızı", value: "#ef4444" },
            { name: "Turuncu", value: "#f97316" },
            { name: "Sarı", value: "#eab308" },
            { name: "Yeşil", value: "#22c55e" },
            { name: "Mavi", value: "#3b82f6" },
            { name: "Lacivert", value: "#4f46e5" },
            { name: "Mor", value: "#a855f7" }
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
                colorPreview.style.backgroundColor = color.value;
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

        const lineWidths = [1, 2, 4, 6, 10, 16, 24, 32];

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
                eraserTool.setLineWidth(lineWidth);
                partialEraserTool.setLineWidth(lineWidth);
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
            undoButton,
            newDrawButton,
            redoButton,
            penControl,
            eraserControl,
            selectionButton,
            screenCaptureButton,
            colorControl,
            widthControl
        );
        sidebar.appendChild(toolbar);
        document.body.appendChild(sidebar);

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
