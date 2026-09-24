import { ToolManager } from "../core/ToolManager";
import { Document } from "../document/Document";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { EraserTool } from "../tools/EraserTool";
import { HighlighterTool } from "../tools/HighlighterTool";
import { SelectionTool } from "../tools/SelectionTool";
import { PenTool } from "../tools/PenTool";
import { PartialEraserTool } from "../tools/PartialEraserTool";
import { HistoryManager } from "../core/HistoryManager";
import { ShapesTool } from "../tools/ShapesTool";
import { AutoSaveManager } from "../autosave/AutoSaveManager";
import type { DrawingRepository } from "../storage/DrawingRepository";
import { DrawingsPanel } from "./DrawingsPanel";
import type { ShapeType } from "../shapes/ShapeFactory";
import {
    defaultWidthForDeviceProfile,
    getLineProfile,
    widthsForDeviceProfile
} from "../platform/DeviceProfile";
import pencilIcon from "../assets/icons/pencil.svg";
import highlighterIcon from "../assets/icons/highlighter.svg";
import eraserNormalIcon from "../assets/icons/eraser_normal.svg";
import eraserStrokeIcon from "../assets/icons/eraser_stroke.svg";
import selectMoveIcon from "../assets/icons/select_move.svg";
import rectangleIcon from "../assets/icons/rectangle.svg";
import circleIcon from "../assets/icons/circle.svg";
import triangleIcon from "../assets/icons/triangle.svg";
import lineIcon from "../assets/icons/line.svg";
import newDrawIcon from "../assets/icons/newdraw.svg";
import undoIcon from "../assets/icons/undo.svg";
import redoIcon from "../assets/icons/redo.svg";
import type { LinkedPhotoManager } from "../photos/LinkedPhotoManager";

export class ToolbarPanel {

    private readonly newDrawButton: HTMLButtonElement;
    private readonly drawingsPanel: DrawingsPanel;

    public getNewDrawButton(): HTMLButtonElement {

        return this.newDrawButton;

    }

    public getDrawingsPanel(): DrawingsPanel {

        return this.drawingsPanel;

    }

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
        shapesTool: ShapesTool,
        autoSaveManager: AutoSaveManager,
        repository: DrawingRepository,
        _canvas: HTMLCanvasElement,
        photoLinkManager: LinkedPhotoManager | null = null
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

        const undoButton = this.createIconButton("Çizimi Geri Al", undoIcon, {
            className: "sidebar__history"
        });

        const redoButton = this.createIconButton("Çizimi Yinele", redoIcon, {
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


        const penButton = this.createIconButton("Kalem", pencilIcon, {
            className: "sidebar__tool",
            isSelected: true,
            selectedClass: "sidebar__tool--selected"
        });
        const eraserButton = this.createIconButton("Normal Silgi", eraserNormalIcon, {
            className: "sidebar__tool",
            isSelected: false,
            selectedClass: "sidebar__tool--selected"
        });

        const shapesButton = this.createIconButton("Şekil", rectangleIcon, {
            className: "sidebar__tool",
            isSelected: false,
            selectedClass: "sidebar__tool--selected"
        });

        const highlighterButton = this.createIconButton("Fosforlu Kalem", highlighterIcon, {
            className: "sidebar__pen-option",
            isSelected: false,
            onSelect: () => {
                selectPen(highlighterTool, highlighterButton);
            }
        });
        const selectionButton = this.createIconButton("Seç ve Taşı", selectMoveIcon, {
            className: "sidebar__tool",
            isSelected: false,
            selectedClass: "sidebar__tool--selected",
            onSelect: () => {
                toolManager.setTool(selectionTool);
            }
        });

        const toolButtons: HTMLButtonElement[] = [
            penButton,
            eraserButton,
            shapesButton,
            selectionButton
        ];

        const selectTool = (selectedButton: HTMLButtonElement): void => {
            for (const button of toolButtons) {
                const isSelected = button === selectedButton;

                button.classList.toggle("sidebar__tool--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }
        };

        selectionButton.addEventListener("click", () => selectTool(selectionButton));

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

        const shapesControl = document.createElement("div");
        shapesControl.className = "sidebar__control";

        const shapesPalette = document.createElement("div");
        shapesPalette.className = "sidebar__flyout sidebar__shapes-palette";
        shapesPalette.hidden = true;
        shapesPalette.setAttribute("role", "group");
        shapesPalette.setAttribute("aria-label", "Şekil türü");
        shapesButton.setAttribute("aria-expanded", "false");
        shapesControl.append(shapesButton, shapesPalette);

        const colorControl = document.createElement("div");
        colorControl.className = "sidebar__control";

        const colors = [
            { name: "Kırmızı", value: "#ff0000" },
            { name: "Siyah", value: "#000000" },
            { name: "Turuncu", value: "#ff8000" },
            { name: "Sarı", value: "#ffff00" },
            { name: "Yeşil", value: "#00ff00" },
            { name: "Mavi", value: "#0000ff" },
            { name: "Lacivert", value: "#000080" },
            { name: "Mor", value: "#800080" }
        ];

        let currentColorIndex = 0;
        let previousColorIndex = 1;

        const colorButton = document.createElement("button");
        colorButton.type = "button";
        colorButton.className = "sidebar__color-trigger";


        const colorPreview = document.createElement("span");
        colorPreview.className = "sidebar__color-preview";
        colorPreview.style.backgroundColor = "#ff0000";

        colorButton.appendChild(colorPreview);


        colorButton.setAttribute("aria-label", "Renk: Kırmızı");
        colorButton.setAttribute("aria-expanded", "false");

        const colorPalette = document.createElement("div");
        colorPalette.className = "sidebar__flyout sidebar__color-palette";
        colorPalette.hidden = true;
        colorPalette.setAttribute("role", "group");
        colorPalette.setAttribute("aria-label", "Kalem rengi");

        // Önceki renk rozeti: tek dokunuşla son iki renk arası geçiş.
        const prevColorButton = document.createElement("button");
        prevColorButton.type = "button";
        prevColorButton.className = "sidebar__prev-color";

        const renderColorUi = (): void => {
            const current = colors[currentColorIndex];
            const previous = colors[previousColorIndex];
            colorPreview.style.backgroundColor = current.value;
            colorButton.setAttribute("aria-label", `Renk: ${current.name}`);
            prevColorButton.style.backgroundColor = previous.value;
            prevColorButton.title = `Önceki renk: ${previous.name}`;
            prevColorButton.setAttribute("aria-label", `Önceki renk: ${previous.name}`);

            for (const [index, button] of colorPalette.querySelectorAll("button").entries()) {
                const isCurrent = index === currentColorIndex;

                button.classList.toggle("sidebar__color--selected", isCurrent);
                button.setAttribute("aria-pressed", String(isCurrent));
            }
        };

        const applyColorIndex = (index: number): void => {
            if (index === currentColorIndex) {
                return;
            }

            previousColorIndex = currentColorIndex;
            currentColorIndex = index;
            penTool.setColor(colors[index].value);
            highlighterTool.setColor(colors[index].value);
            renderColorUi();
        };

        prevColorButton.addEventListener("click", () => {
            applyColorIndex(previousColorIndex);
        });

        colorControl.append(colorButton, prevColorButton, colorPalette);

        const widthControl = document.createElement("div");
        widthControl.className = "sidebar__control";

        // Kalem kalınlık profilleri: mobil/tablet/PC için standart,
        // akıllı tahta için büyük değerler.
        const lineProfile = getLineProfile();

        const widthsForProfile = (): number[] => {
            return widthsForDeviceProfile(lineProfile);
        };

        const defaultWidthForProfile = (): number => {
            return defaultWidthForDeviceProfile(lineProfile);
        };

        // Önizleme çubuğu: değer aralığını 3-14px bandına oranlar.
        // Böylece hem ince-kalın dizilimi korunur hem daireleşme olmaz.
        const previewWidthForProfile = (lineWidth: number): number => {
            const widths = widthsForProfile();
            const min = widths[0];
            const max = widths[widths.length - 1];

            if (!(max > min)) {
                return 8;
            }

            return 3 + ((lineWidth - min) / (max - min)) * 11;
        };

        const widthButton = document.createElement("button");
        widthButton.type = "button";
        widthButton.className = "sidebar__width-trigger";
        widthButton.style.setProperty("--line-width", `${previewWidthForProfile(defaultWidthForProfile())}px`);
        widthButton.setAttribute("aria-label", `Kalınlık: ${defaultWidthForProfile()} piksel`);
        widthButton.title = `Kalınlık: ${defaultWidthForProfile()} piksel`;
        widthButton.setAttribute("aria-expanded", "false");

        const widthPalette = document.createElement("div");
        widthPalette.className = "sidebar__flyout sidebar__width-palette";
        widthPalette.hidden = true;
        widthPalette.setAttribute("role", "group");
        widthPalette.setAttribute("aria-label", "Kalem kalınlığı");

        const newDrawButton = this.createIconButton("Yeni Çizim", newDrawIcon, {
            className: "sidebar__history"
        });
        this.newDrawButton = newDrawButton;
        newDrawButton.addEventListener("click", async () => {
            const nextPhoto = photoLinkManager !== null
                ? await photoLinkManager.prepareNewDrawing()
                : null;

            await autoSaveManager.newDrawing();

            toolManager.getActiveTool()?.cancel();
            drawingDocument.clearCurrentPage();
            historyManager.reset();
            autoSaveManager.resetActiveDocument();
            documentRenderer.render();

            documentRenderer.setGuideLines("none");
            documentRenderer.render();

            currentColorIndex = 0;
            previousColorIndex = 1;
            penTool.setColor(colors[currentColorIndex].value);
            highlighterTool.setColor(colors[currentColorIndex].value);
            renderColorUi();
            const resetWidth = defaultWidthForProfile();
            penTool.setLineWidth(resetWidth);
            highlighterTool.setLineWidth(resetWidth);
            eraserTool.setLineWidth(resetWidth);
            partialEraserTool.setLineWidth(resetWidth);
            widthButton.style.setProperty("--line-width", `${previewWidthForProfile(resetWidth)}px`);
            widthButton.setAttribute("aria-label", `Kalınlık: ${resetWidth} piksel`);

            for (const button of widthPalette.querySelectorAll("button[data-width]")) {
                const isSelected = button.getAttribute("data-width") === String(resetWidth);

                button.classList.toggle("sidebar__width--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }



            selectShape(shapeOptions[0].type, shapeButtons[0]);
            selectEraser(partialEraserTool, partialEraserButton);
            selectPen(penTool, normalPenButton);
            setToolbarOpen(true);

            if (nextPhoto !== null && photoLinkManager !== null) {
                photoLinkManager.placePreparedPhoto(nextPhoto);
            }

            window.dispatchEvent(new CustomEvent("newdraw:started"));
        });

        const flyouts = [
            { button: penButton, panel: penPalette },
            { button: eraserButton, panel: eraserPalette },
            { button: shapesButton, panel: shapesPalette },
            { button: colorButton, panel: colorPalette },
            { button: widthButton, panel: widthPalette }
        ];

        let toggle: HTMLButtonElement | null = null;

        const syncToggleVisibility = (): void => {
            if (toggle === null) {
                return;
            }

            const anyFlyoutOpen = flyouts.some((flyout) => !flyout.panel.hidden);

            toggle.hidden = anyFlyoutOpen;
        };

        const closeFlyouts = (): void => {
            for (const flyout of flyouts) {
                flyout.panel.hidden = true;
                flyout.button.setAttribute("aria-expanded", "false");
            }

            syncToggleVisibility();
        };

        // Zoom'lu atanın içindeki sabit konumlu paletlerde tarayıcı
        // offset'leri ölçeklenmemiş uzayda yorumlayıp öyle çiziyor.
        // Oranı hesaplanmış stilden değil, görsel ölçümden alıyoruz
        // (zoom üst elemanda olduğu için iç elemanın computed değeri 1 döner).
        const zoomProbe = document.createElement("div");
        zoomProbe.setAttribute("aria-hidden", "true");
        zoomProbe.style.cssText = [
            "position:absolute;",
            "visibility:hidden;",
            "pointer-events:none;",
            "width:100px;",
            "height:0;",
            "padding:0;",
            "border:0;"
        ].join("");
        toolbar.appendChild(zoomProbe);

        const toolbarZoom = (): number => {
            const measured = zoomProbe.getBoundingClientRect().width / 100;

            return Number.isFinite(measured) && measured > 0 ? measured : 1;
        };

        const toggleFlyout = (button: HTMLButtonElement, panel: HTMLDivElement): void => {
            const shouldOpen = panel.hidden;

            closeFlyouts();

            if (shouldOpen) {
                const buttonBounds = button.getBoundingClientRect();
                // Palet, zoom'lu araç çubuğunun içinde sabit konumlu: tarayıcı
                // offset'leri ölçeklenmemiş uzayda yorumlayıp öyle çiziyor,
                // o yüzden ölçümler zoom'a bölünerek veriliyor.
                const zoom = toolbarZoom();

                panel.hidden = false;
                button.setAttribute("aria-expanded", "true");

                // Araç çubuğu altta dock'lu: palet butonun üstünde açılır.
                panel.style.left = `${window.innerWidth / 2 / zoom}px`;
                panel.style.top = `${Math.max(8 / zoom, buttonBounds.top / zoom - panel.offsetHeight - 16 / zoom)}px`;
            }

            syncToggleVisibility();
        };

        colorButton.addEventListener("click", () => toggleFlyout(colorButton, colorPalette));
        widthButton.addEventListener("click", () => toggleFlyout(widthButton, widthPalette));

        let lastSelectedEraserTool: EraserTool | PartialEraserTool = partialEraserTool;
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


            eraserButton.title = `${selectedButton.title}`;
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

            penButton.title = `${selectedButton.title}`;
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

        const normalPenButton = this.createIconButton("Normal Kalem", pencilIcon, {
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


        penButton.title = `${normalPenButton.title}`;
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
            } else if (activeTool === shapesTool) {
                selectTool(shapesButton);
            }
        });

        const strokeEraserButton = this.createIconButton("Çizgi Silgi", eraserStrokeIcon, {
            className: "sidebar__eraser-option",
            isSelected: false,
            onSelect: () => {
                selectEraser(eraserTool, strokeEraserButton);
            }
        });
        const partialEraserButton = this.createIconButton("Normal Silgi", eraserNormalIcon, {
            className: "sidebar__eraser-option",
            isSelected: true,
            selectedClass: "sidebar__eraser-option--selected",
            onSelect: () => {
                selectEraser(partialEraserTool, partialEraserButton);
            }
        });
        lastSelectedEraserButton = partialEraserButton;
        this.copyButtonIcon(eraserButton, partialEraserButton);
        eraserButton.title = `${partialEraserButton.title}`;
        eraserButton.setAttribute("aria-label", `Silgi: ${partialEraserButton.title}`);
        eraserPalette.append(partialEraserButton, strokeEraserButton);

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

        const shapeOptions: Array<{ type: ShapeType; label: string; icon: string }> = [
            { type: "line", label: "Çizgi", icon: lineIcon },
            { type: "rectangle", label: "Dikdörtgen", icon: rectangleIcon },
            { type: "ellipse", label: "Çember", icon: circleIcon },
            { type: "triangle", label: "Üçgen", icon: triangleIcon }
        ];

        let lastSelectedShapeType: ShapeType = "line";
        let lastSelectedShapeButton: HTMLButtonElement | null = null;

        const selectShape = (
            type: ShapeType,
            selectedButton: HTMLButtonElement
        ): void => {
            closeFlyouts();
            lastSelectedShapeType = type;
            lastSelectedShapeButton = selectedButton;
            toolManager.setTool(shapesTool);
            shapesTool.setShapeType(type);
            selectTool(shapesButton);
            this.copyButtonIcon(shapesButton, selectedButton);

            shapesButton.title = `${selectedButton.title}`;
            shapesButton.setAttribute("aria-label", `Şekil: ${selectedButton.title}`);

            for (const button of shapesPalette.querySelectorAll("button")) {
                const isSelected = button === selectedButton;

                button.classList.toggle("sidebar__shape-option--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }

            shapesPalette.hidden = true;
            shapesButton.setAttribute("aria-expanded", "false");
        };

        const shapeButtons: HTMLButtonElement[] = [];

        for (const option of shapeOptions) {
            const shapeButton = this.createIconButton(option.label, option.icon, {
                className: "sidebar__shape-option",
                isSelected: option.type === "line",
                selectedClass: "sidebar__shape-option--selected",
                onSelect: () => {
                    selectShape(option.type, shapeButton);
                }
            });

            shapeButtons.push(shapeButton);
            shapesPalette.appendChild(shapeButton);
        }

        lastSelectedShapeButton = shapeButtons[0];
        this.copyButtonIcon(shapesButton, shapeButtons[0]);
        shapesButton.title = `${shapeButtons[0].title}`;
        shapesButton.setAttribute("aria-label", `Şekil: ${shapeButtons[0].title}`);

        shapesButton.addEventListener("click", () => {
            const activeTool = toolManager.getActiveTool();

            if (activeTool === shapesTool) {
                toggleFlyout(shapesButton, shapesPalette);
                return;
            }

            if (lastSelectedShapeButton !== null) {
                selectShape(lastSelectedShapeType, lastSelectedShapeButton);
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

        for (const [index, color] of colors.entries()) {
            const paletteButton = document.createElement("button");
            const isSelected = index === currentColorIndex;
            paletteButton.type = "button";
            paletteButton.className = "sidebar__color";
            paletteButton.style.backgroundColor = color.value;
            paletteButton.setAttribute("aria-label", color.name);
            paletteButton.setAttribute("aria-pressed", String(isSelected));
            paletteButton.classList.toggle("sidebar__color--selected", isSelected);

            paletteButton.addEventListener("click", () => {
                applyColorIndex(index);

                colorPalette.hidden = true;
                colorButton.setAttribute("aria-expanded", "false");
                syncToggleVisibility();
            });

            colorPalette.appendChild(paletteButton);
        }

        renderColorUi();

        const applyLineWidth = (lineWidth: number): void => {
            penTool.setLineWidth(lineWidth);
            highlighterTool.setLineWidth(lineWidth);
            eraserTool.setLineWidth(lineWidth);
            partialEraserTool.setLineWidth(lineWidth);
            widthButton.style.setProperty("--line-width", `${previewWidthForProfile(lineWidth)}px`);
            widthButton.setAttribute("aria-label", `Kalınlık: ${lineWidth} piksel`);
            widthButton.title = `Kalınlık: ${lineWidth} piksel`;

            for (const button of widthPalette.querySelectorAll("button[data-width]")) {
                const isCurrentWidth = button.getAttribute("data-width") === String(lineWidth);

                button.classList.toggle("sidebar__width--selected", isCurrentWidth);
                button.setAttribute("aria-pressed", String(isCurrentWidth));
            }

            widthPalette.hidden = true;
            widthButton.setAttribute("aria-expanded", "false");
            syncToggleVisibility();
        };

        const buildWidthPalette = (): void => {
            widthPalette.replaceChildren();

            for (const lineWidth of widthsForProfile()) {
                const paletteButton = document.createElement("button");
                const isSelected = lineWidth === defaultWidthForProfile();

                paletteButton.type = "button";
                paletteButton.className = "sidebar__width";
                paletteButton.style.setProperty("--line-width", `${previewWidthForProfile(lineWidth)}px`);
                paletteButton.setAttribute("data-width", String(lineWidth));
                paletteButton.setAttribute("aria-label", `${lineWidth} piksel kalınlık`);
                paletteButton.title = `${lineWidth} piksel`;
                paletteButton.setAttribute("aria-pressed", String(isSelected));
                paletteButton.classList.toggle("sidebar__width--selected", isSelected);

                paletteButton.addEventListener("click", () => {
                    applyLineWidth(lineWidth);
                });

                widthPalette.appendChild(paletteButton);
            }
        };

        buildWidthPalette();
        applyLineWidth(defaultWidthForProfile());

        widthControl.append(widthButton, widthPalette);
        toolbar.append(
            undoButton,
            penControl,
            redoButton,
            eraserControl,
            shapesControl,
            selectionButton,
            colorControl,
            widthControl
        );
        sidebar.appendChild(toolbar);
        document.body.appendChild(sidebar);

        const toggleButton = document.createElement("button");
        toggleButton.type = "button";
        toggleButton.className = "sidebar__toggle";
        toggleButton.setAttribute("aria-label", "Araç çubuğunu kapat");
        toggleButton.setAttribute("aria-expanded", "true");
        toggleButton.innerHTML = [
            `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"`,
            ` stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
            `<path d="m18 15-6-6-6 6"/>`,
            `</svg>`
        ].join("");
        document.body.appendChild(toggleButton);
        toggle = toggleButton;

        const updateToggleTop = (): void => {
            if (document.body.classList.contains("sidebar-closed")) {
                return;
            }

            const rect = sidebar.getBoundingClientRect();
            document.documentElement.style.setProperty(
                "--sidebar-toggle-top",
                `${rect.bottom}px`
            );
            document.documentElement.style.setProperty(
                "--sidebar-toggle-bottom",
                `${window.innerHeight - rect.top + 8}px`
            );
        };

        updateToggleTop();
        window.addEventListener("resize", updateToggleTop);

        const setToolbarOpen = (isOpen: boolean): void => {
            document.body.classList.toggle("sidebar-closed", !isOpen);
            toggle.setAttribute("aria-expanded", String(isOpen));
            toggle.setAttribute(
                "aria-label",
                isOpen ? "Araç çubuğunu kapat" : "Araç çubuğunu aç"
            );
        };

        // Açılışta açık gelsin; sadece toggle butonu kapatıp açabilsin.
        setToolbarOpen(true);

        toggle.addEventListener("click", () => {
            setToolbarOpen(document.body.classList.contains("sidebar-closed"));
        });

        window.addEventListener("drawing:opened", () => {
            setToolbarOpen(true);
        });

        this.drawingsPanel = new DrawingsPanel({
            repository,
            autoSaveManager,
            toolManager,
            selectionTool,
            drawingDocument,
            documentRenderer,
            historyManager,
            canvas: _canvas
        });

    }






    private copyButtonIcon(
        target: HTMLButtonElement,
        source: HTMLButtonElement
    ): void {

        target.replaceChildren();

        const icon = source.querySelector("img");

        if (icon) {
            const img = document.createElement("img");
            img.src = (icon as HTMLImageElement).src;
            img.alt = "";
            img.draggable = false;

            target.appendChild(img);
        } else {
            target.textContent = source.textContent ?? "";
        }

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
