import { ToolManager } from "../core/ToolManager";
import { Document } from "../document/Document";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import { EraserTool } from "../tools/EraserTool";
import { HighlighterTool } from "../tools/HighlighterTool";
import { SelectionTool } from "../tools/SelectionTool";
import { PenTool } from "../tools/PenTool";
import { PartialEraserTool } from "../tools/PartialEraserTool";
import { TextTool } from "../tools/TextTool";
import { ScreenCaptureTool } from "../tools/ScreenCaptureTool";
import { HistoryManager } from "../core/HistoryManager";
import { ShapesTool } from "../tools/ShapesTool";
import { AutoSaveManager } from "../autosave/AutoSaveManager";
import type { DrawingRepository } from "../storage/DrawingRepository";
import { DrawingsPanel } from "./DrawingsPanel";
import { showStorageError } from "./StorageErrorDialog";
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
import captureIcon from "../assets/icons/capture.svg";
import textIcon from "../assets/icons/text.svg";
import squareIcon from "../assets/icons/square.svg";
import gridIcon from "../assets/icons/grid.svg";
import rowsIcon from "../assets/icons/rows.svg";
import columnsIcon from "../assets/icons/columns.svg";
import type { LinkedPhotoManager } from "../photos/LinkedPhotoManager";
import type { GuideLineType } from "../renderers/DocumentRenderer";

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
        photoLinkManager: LinkedPhotoManager | null = null,
        textTool: TextTool,
        screenCaptureTool: ScreenCaptureTool,
        desktopAvailable: boolean
    ) {

        const sidebar = document.createElement("aside");
        sidebar.className = "sidebar";
        sidebar.setAttribute("aria-label", "Araçlar");

        const toolbar = document.createElement("div");
        toolbar.className = "sidebar__toolbar";

        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "sidebar__handle";
        handle.setAttribute("aria-label", "Araç çubuğu konumu (değiştirmek için çift tıkla)");
        handle.title = "Çift tıkla: konumu değiştir (alt / sol / üst)";
        handle.append("dr");

        const brandAccent = document.createElement("span");
        brandAccent.className = "sidebar__brand-accent";
        brandAccent.textContent = "AW";
        handle.appendChild(brandAccent);

        toolbar.appendChild(handle);

        handle.addEventListener("dblclick", () => {
            closeAllFlyouts();
            const body = document.body;
            let dock: "bottom" | "left" | "top" = "bottom";

            if (body.classList.contains("dock-left")) {
                body.classList.remove("dock-left");
                body.classList.add("dock-top");
                dock = "top";
            } else if (body.classList.contains("dock-top")) {
                body.classList.remove("dock-top");
            } else {
                body.classList.add("dock-left");
                dock = "left";
            }

            sidebar.classList.remove("dock-in-bottom", "dock-in-left", "dock-in-top");
            void sidebar.offsetWidth;
            sidebar.classList.add(`dock-in-${dock}`);
            updateToolbarVars();
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

        const prevDrawingButton = this.drawingsPanel.getPrevButton();
        const nextDrawingButton = this.drawingsPanel.getNextButton();

        const linkButton = document.createElement("button");
        linkButton.type = "button";
        linkButton.className = "sidebar__tool";

        if (photoLinkManager !== null) {
            photoLinkManager.attachButton(linkButton);
        } else {
            linkButton.hidden = true;
        }

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

        const leftToolButtons: HTMLButtonElement[] = [textButton];

        if (screenCaptureButton !== null) {
            leftToolButtons.push(screenCaptureButton);
        }

        const selectLeftTool = (selectedButton: HTMLButtonElement): void => {
            for (const button of leftToolButtons) {
                const isSelected = button === selectedButton;

                button.classList.toggle("sidebar__tool--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }
        };

        textButton.addEventListener("click", () => selectLeftTool(textButton));

        if (screenCaptureButton !== null) {
            const captureButton = screenCaptureButton;
            captureButton.addEventListener("click", () => selectLeftTool(captureButton));
        }

        const guideControl = document.createElement("div");
        guideControl.className = "sidebar__control";

        const guideButton = this.createIconButton("Çizgisiz", squareIcon, {
            className: "sidebar__tool"
        });
        guideButton.setAttribute("aria-expanded", "false");

        const guidePalette = document.createElement("div");
        guidePalette.className = "sidebar__flyout sidebar__guideline-palette";
        guidePalette.hidden = true;
        guidePalette.setAttribute("role", "group");
        guidePalette.setAttribute("aria-label", "Kılavuz çizgileri");
        guideControl.append(guideButton, guidePalette);

        const guideOptions: Array<{ type: GuideLineType; label: string; icon: string }> = [
            { type: "none", label: "Çizgisiz", icon: squareIcon },
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

        for (const option of guideOptions) {
            const guideOptionButton = this.createIconButton(option.label, option.icon, {
                className: "sidebar__guideline-option",
                isSelected: option.type === "none",
                selectedClass: "sidebar__guideline-option--selected",
                onSelect: () => {
                    selectGuideLines(option.type, guideOptionButton);
                }
            });

            guidePalette.appendChild(guideOptionButton);
        }

        guideButton.addEventListener("click", () => {
            if (guidePalette.hidden) {
                closeFlyouts();
                placeFlyout(guideButton, guidePalette, true, true);
            } else {
                guidePalette.hidden = true;
                guideButton.setAttribute("aria-expanded", "false");
            }
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
        colorControl.className = "sidebar__control sidebar__control--colors";

        const colors = [
            { name: "Kırmızı", value: "#ff0000" },
            { name: "Mavi", value: "#0000ff" },
            { name: "Siyah", value: "#000000" },
            { name: "Turuncu", value: "#ff8000" },
            { name: "Sarı", value: "#ffff00" },
            { name: "Yeşil", value: "#00ff00" },
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
            colorButton.title = current.name;
            prevColorButton.style.backgroundColor = previous.value;
            prevColorButton.title = previous.name;
            prevColorButton.setAttribute("aria-label", previous.name);

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
        widthButton.setAttribute("aria-label", `${defaultWidthForProfile()}`);
        widthButton.title = `${defaultWidthForProfile()}`;
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
        const startNewDrawing = async (): Promise<void> => {
            const nextPhoto = photoLinkManager !== null
                ? await photoLinkManager.prepareNewDrawing()
                : null;

            if (nextPhoto === undefined) {
                return;
            }

            try {
                await autoSaveManager.newDrawing();
            } catch (error) {
                photoLinkManager?.cancelPreparedNewDrawing();
                await showStorageError(error);
                return;
            }

            if (photoLinkManager !== null && !photoLinkManager.beginPreparedNewDrawing()) {
                return;
            }

            const activeTool = toolManager.getActiveTool();
            activeTool?.cancel();
            // Fotoğraf kalem etkinken de seçilmiş olabilir; eski çerçeveyi temizle.
            if (activeTool !== selectionTool) {
                selectionTool.cancel();
            }
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
            widthButton.setAttribute("aria-label", `${resetWidth}`);

            for (const button of widthPalette.querySelectorAll("button[data-width]")) {
                const isSelected = button.getAttribute("data-width") === String(resetWidth);

                button.classList.toggle("sidebar__width--selected", isSelected);
                button.setAttribute("aria-pressed", String(isSelected));
            }



            selectShape(shapeOptions[0].type, shapeButtons[0]);
            selectEraser(partialEraserTool, partialEraserButton);
            selectPen(penTool, normalPenButton);

            photoLinkManager?.placePreparedPhoto(nextPhoto);

            window.dispatchEvent(new CustomEvent("newdraw:started"));
        };

        newDrawButton.addEventListener("click", async () => {
            // Fotoğraf hazırlanırken ve kayıt sürerken ikinci bir geçiş başlatma.
            if (newDrawButton.disabled) {
                return;
            }

            newDrawButton.disabled = true;

            try {
                await startNewDrawing();
            } finally {
                newDrawButton.disabled = false;
            }
        });

        const flyouts = [
            { button: penButton, panel: penPalette, bottomAlign: false },
            { button: eraserButton, panel: eraserPalette, bottomAlign: false },
            { button: shapesButton, panel: shapesPalette, bottomAlign: true },
            { button: colorButton, panel: colorPalette, bottomAlign: false },
            { button: widthButton, panel: widthPalette, bottomAlign: false }
        ];

        const closeFlyouts = (): void => {
            for (const flyout of flyouts) {
                flyout.panel.hidden = true;
                flyout.button.setAttribute("aria-expanded", "false");
            }
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

        const currentDock = (): "bottom" | "left" | "top" => {
            if (document.body.classList.contains("dock-left")) {
                return "left";
            }

            if (document.body.classList.contains("dock-top")) {
                return "top";
            }

            return "bottom";
        };

        const closeAllFlyouts = (): void => {
            closeFlyouts();
            guidePalette.hidden = true;
            guideButton.setAttribute("aria-expanded", "false");
        };

        const placeFlyout = (
            button: HTMLButtonElement,
            panel: HTMLDivElement,
            bottomAlign: boolean = false,
            lastItemAlign: boolean = false
        ): void => {
            const buttonBounds = button.getBoundingClientRect();
            // Palet, zoom'lu araç çubuğunun içinde sabit konumlu: tarayıcı
            // offset'leri ölçeklenmemiş uzayda yorumlayıp öyle çiziyor,
            // o yüzden ölçümler zoom'a bölünerek veriliyor.
            const zoom = toolbarZoom();
            const dock = currentDock();

            panel.hidden = false;
            button.setAttribute("aria-expanded", "true");
            panel.classList.toggle("sidebar__flyout--vertical", dock === "left");

            if (dock === "left") {
                // Solda çubuğun kendisi dönüşümlü (translateY) olduğu için
                // palet ona göre konumlanır.
                const sidebarBounds = sidebar.getBoundingClientRect();
                panel.style.transform = "none";
                panel.style.left = `${(buttonBounds.right - sidebarBounds.left) / zoom + 16 / zoom}px`;

                if (bottomAlign) {
                    // Kılavuzda son öğenin altı buton altıyla hizalanır (+8 iç boşluk payı).
                    const shift = lastItemAlign ? 8 / zoom : 0;
                    panel.style.top = `${Math.min(
                        Math.max(8 / zoom, (buttonBounds.bottom - sidebarBounds.top) / zoom - panel.offsetHeight + shift),
                        window.innerHeight - panel.offsetHeight - 8
                    )}px`;
                } else {
                    const maxTop = Math.max(8, sidebarBounds.height / zoom - panel.offsetHeight - 8);
                    panel.style.top = `${Math.min(
                        Math.max(8 / zoom, (buttonBounds.top - sidebarBounds.top) / zoom),
                        maxTop
                    )}px`;
                }
            } else {
                panel.style.transform = "none";
                const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
                panel.style.left = `${Math.min(Math.max(8, buttonBounds.left / zoom), maxLeft)}px`;

                if (dock === "top") {
                    panel.style.top = `${buttonBounds.bottom / zoom + 16 / zoom}px`;
                } else {
                    panel.style.top = `${Math.max(8 / zoom, buttonBounds.top / zoom - panel.offsetHeight - 16 / zoom)}px`;
                }
            }
        };

        const toggleFlyout = (
            button: HTMLButtonElement,
            panel: HTMLDivElement
        ): void => {
            const shouldOpen = panel.hidden;

            closeFlyouts();

            if (shouldOpen) {
                const entry = flyouts.find((flyout) => flyout.panel === panel);
                placeFlyout(button, panel, entry?.bottomAlign ?? false);
            }
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
            } else if (activeTool === textTool) {
                selectLeftTool(textButton);
            } else if (screenCaptureButton !== null && activeTool === screenCaptureTool) {
                selectLeftTool(screenCaptureButton);
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
            paletteButton.title = color.name;
            paletteButton.setAttribute("aria-pressed", String(isSelected));
            paletteButton.classList.toggle("sidebar__color--selected", isSelected);

            paletteButton.addEventListener("click", () => {
                applyColorIndex(index);

                colorPalette.hidden = true;
                colorButton.setAttribute("aria-expanded", "false");
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
            widthButton.setAttribute("aria-label", `${lineWidth}`);
            widthButton.title = `${lineWidth}`;

            for (const button of widthPalette.querySelectorAll("button[data-width]")) {
                const isCurrentWidth = button.getAttribute("data-width") === String(lineWidth);

                button.classList.toggle("sidebar__width--selected", isCurrentWidth);
                button.setAttribute("aria-pressed", String(isCurrentWidth));
            }

            widthPalette.hidden = true;
            widthButton.setAttribute("aria-expanded", "false");
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
                paletteButton.setAttribute("aria-label", `${lineWidth}`);
                paletteButton.title = `${lineWidth}`;
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
            colorControl,
            widthControl,
            undoButton,
            redoButton,
            penControl,
            eraserControl,
            selectionButton,
            newDrawButton,
            prevDrawingButton,
            nextDrawingButton,
            linkButton,
            shapesControl,
            textButton,
            ...(screenCaptureButton !== null ? [screenCaptureButton] : []),
            guideControl
        );
        sidebar.appendChild(toolbar);
        document.body.appendChild(sidebar);

        const updateToolbarVars = (): void => {
            for (const flyout of flyouts) {
                if (!flyout.panel.hidden) {
                    placeFlyout(flyout.button, flyout.panel, flyout.bottomAlign);
                }
            }

            if (!guidePalette.hidden) {
                placeFlyout(guideButton, guidePalette, true, true);
            }
        };

        updateToolbarVars();
        window.addEventListener("resize", updateToolbarVars);

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
