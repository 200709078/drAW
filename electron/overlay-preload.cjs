// Generated from overlay-preload.ts by scripts/build-overlay-preload.mjs.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
window.addEventListener("DOMContentLoaded", () => {
    const image = document.querySelector("#capture");
    const interaction = document.querySelector("#interaction");
    const selection = document.querySelector("#selection");
    const selectionButton = document.querySelector("#selectionButton");
    const screenButton = document.querySelector("#screenButton");
    const cancelButton = document.querySelector("#cancelButton");
    const captureButton = document.querySelector("#captureButton");
    if (image === null || interaction === null || selection === null) {
        return;
    }
    let selX = 0;
    let selY = 0;
    let selWidth = 0;
    let selHeight = 0;
    let locked = false;
    let sourceReady = false;
    let savedSelection = null;
    const clamp = (value, min, max) => {
        return Math.max(min, Math.min(max, value));
    };
    const getContentRect = () => {
        const bounds = image.getBoundingClientRect();
        const scale = Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        return {
            left: bounds.left + (bounds.width - width) / 2,
            top: bounds.top + (bounds.height - height) / 2,
            width,
            height
        };
    };
    const getPoint = (event) => {
        const bounds = getContentRect();
        return {
            x: clamp(event.clientX - bounds.left, 0, bounds.width),
            y: clamp(event.clientY - bounds.top, 0, bounds.height)
        };
    };
    const isInsideSelection = (x, y) => {
        return x >= selX && x <= selX + selWidth && y >= selY && y <= selY + selHeight;
    };
    const renderSelection = () => {
        const bounds = getContentRect();
        selection.style.left = `${bounds.left + selX}px`;
        selection.style.top = `${bounds.top + selY}px`;
        selection.style.width = `${selWidth}px`;
        selection.style.height = `${selHeight}px`;
        selection.hidden = false;
    };
    const setSelection = (x, y, width, height) => {
        selX = x;
        selY = y;
        selWidth = width;
        selHeight = height;
        renderSelection();
    };
    const resetInitialSelection = () => {
        const bounds = getContentRect();
        const width = Math.min(200, bounds.width);
        const height = Math.min(200, bounds.height);
        setSelection((bounds.width - width) / 2, (bounds.height - height) / 2, width, height);
        setLocked(false);
        savedSelection = { x: selX, y: selY, width: selWidth, height: selHeight };
    };
    let mode = "move";
    let activePointerId = null;
    let toolboxPointerId = null;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let originW = 0;
    let originH = 0;
    let resizeDir = "";
    const updateCursor = (event) => {
        const point = getPoint(event);
        interaction.style.cursor = locked ? "default" : (isInsideSelection(point.x, point.y) ? "grab" : "crosshair");
    };
    const handles = selection.querySelectorAll(".handle");
    const setLocked = (isLocked) => {
        locked = isLocked;
        for (const handle of handles) {
            handle.style.display = isLocked ? "none" : "";
        }
    };
    const selectScreen = () => {
        const bounds = getContentRect();
        const margin = Math.min(1, bounds.width / 4, bounds.height / 4);
        setSelection(margin, margin, bounds.width - margin * 2, bounds.height - margin * 2);
        setLocked(true);
    };
    const startGesture = (event, handleDir = "") => {
        if (!sourceReady || locked || activePointerId !== null || toolboxPointerId !== null || event.button !== 0) {
            return;
        }
        event.preventDefault();
        const point = getPoint(event);
        startX = point.x;
        startY = point.y;
        originX = selX;
        originY = selY;
        originW = selWidth;
        originH = selHeight;
        // Büyütülen tutamaçlar küçük seçimlerde üst üste gelse de orta alan taşınabilsin.
        const central = point.x > selX + Math.min(22, selWidth / 4) &&
            point.x < selX + selWidth - Math.min(22, selWidth / 4) &&
            point.y > selY + Math.min(22, selHeight / 4) &&
            point.y < selY + selHeight - Math.min(22, selHeight / 4);
        if (handleDir !== "" && !central) {
            mode = "resize";
            resizeDir = handleDir;
        }
        else if (!isInsideSelection(point.x, point.y)) {
            mode = "draw";
            setSelection(point.x, point.y, 0, 0);
        }
        else {
            mode = "move";
        }
        activePointerId = event.pointerId;
        interaction.setPointerCapture(event.pointerId);
        if (captureButton !== null)
            captureButton.disabled = true;
    };
    handles.forEach((handle) => {
        handle.addEventListener("pointerdown", (event) => startGesture(event, handle.dataset.dir ?? ""));
    });
    interaction.addEventListener("pointerdown", (event) => startGesture(event));
    const updateGesture = (event) => {
        const point = getPoint(event);
        if (mode === "resize") {
            const dx = point.x - startX;
            const dy = point.y - startY;
            const dir = resizeDir;
            const bounds = getContentRect();
            const minSize = 2;
            let left = originX;
            let top = originY;
            let right = originX + originW;
            let bottom = originY + originH;
            if (dir.includes("w")) {
                left = clamp(originX + dx, 0, right - minSize);
            }
            if (dir.includes("e")) {
                right = clamp(originX + originW + dx, left + minSize, bounds.width);
            }
            if (dir.includes("n")) {
                top = clamp(originY + dy, 0, bottom - minSize);
            }
            if (dir.includes("s")) {
                bottom = clamp(originY + originH + dy, top + minSize, bounds.height);
            }
            setSelection(left, top, right - left, bottom - top);
        }
        else if (mode === "move") {
            const bounds = getContentRect();
            setSelection(clamp(originX + point.x - startX, 0, bounds.width - selWidth), clamp(originY + point.y - startY, 0, bounds.height - selHeight), selWidth, selHeight);
        }
        else {
            setSelection(Math.min(startX, point.x), Math.min(startY, point.y), Math.abs(point.x - startX), Math.abs(point.y - startY));
        }
    };
    interaction.addEventListener("pointermove", (event) => {
        if (!sourceReady)
            return;
        if (activePointerId === null) {
            updateCursor(event);
        }
        else if (event.pointerId === activePointerId) {
            event.preventDefault();
            updateGesture(event);
        }
    });
    const releaseGesture = () => {
        const pointerId = activePointerId;
        activePointerId = null;
        if (captureButton !== null)
            captureButton.disabled = !sourceReady;
        if (pointerId !== null && interaction.hasPointerCapture(pointerId)) {
            interaction.releasePointerCapture(pointerId);
        }
    };
    interaction.addEventListener("pointerup", (event) => {
        if (event.pointerId !== activePointerId) {
            return;
        }
        event.preventDefault();
        // Son pointermove gelmemiş olsa da bırakılan konumu uygula.
        updateGesture(event);
        releaseGesture();
        if (mode === "draw" && (selWidth < 10 || selHeight < 10)) {
            const bounds = getContentRect();
            setSelection(clamp(startX, 0, Math.max(0, bounds.width - 30)), clamp(startY, 0, Math.max(0, bounds.height - 30)), Math.min(30, bounds.width), Math.min(30, bounds.height));
        }
        if (selWidth >= 2 && selHeight >= 2) {
            savedSelection = { x: selX, y: selY, width: selWidth, height: selHeight };
        }
        updateCursor(event);
    });
    const cancelGesture = () => {
        if (activePointerId === null)
            return;
        setSelection(originX, originY, originW, originH);
        releaseGesture();
    };
    const handleCancelledPointer = (event) => {
        if (event.pointerId === activePointerId)
            cancelGesture();
    };
    interaction.addEventListener("pointercancel", handleCancelledPointer);
    interaction.addEventListener("lostpointercapture", handleCancelledPointer);
    window.addEventListener("blur", cancelGesture);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            electron_1.ipcRenderer.send("screen-capture:cancel");
        }
    });
    document.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });
    cancelButton?.addEventListener("click", () => {
        electron_1.ipcRenderer.send("screen-capture:cancel");
    });
    captureButton?.addEventListener("click", () => {
        if (!sourceReady || activePointerId !== null || toolboxPointerId !== null || selWidth < 2 || selHeight < 2) {
            return;
        }
        const bounds = getContentRect();
        electron_1.ipcRenderer.send("screen-capture:complete", {
            x: selX,
            y: selY,
            width: selWidth,
            height: selHeight,
            renderedWidth: bounds.width,
            renderedHeight: bounds.height
        });
    });
    const toolbox = document.querySelector("#toolbox");
    const toolboxTitlebar = toolbox?.querySelector(".toolbox__titlebar") ?? null;
    if (toolbox !== null && toolboxTitlebar !== null) {
        let toolboxOffsetX = 0;
        let toolboxOffsetY = 0;
        toolboxTitlebar.addEventListener("pointerdown", (event) => {
            if (event.button !== 0 || toolboxPointerId !== null || activePointerId !== null) {
                return;
            }
            if (event.target instanceof HTMLElement && event.target.closest(".toolbox__close") !== null) {
                return;
            }
            event.preventDefault();
            toolboxPointerId = event.pointerId;
            toolboxOffsetX = event.clientX - toolbox.getBoundingClientRect().left;
            toolboxOffsetY = event.clientY - toolbox.getBoundingClientRect().top;
            toolboxTitlebar.setPointerCapture(event.pointerId);
        });
        const moveToolbox = (event) => {
            if (event.pointerId !== toolboxPointerId) {
                return;
            }
            event.preventDefault();
            const left = clamp(event.clientX - toolboxOffsetX, 0, Math.max(0, window.innerWidth - toolbox.offsetWidth));
            const top = clamp(event.clientY - toolboxOffsetY, 0, Math.max(0, window.innerHeight - toolbox.offsetHeight));
            toolbox.style.left = `${left}px`;
            toolbox.style.top = `${top}px`;
            toolbox.style.bottom = "auto";
            toolbox.style.transform = "none";
        };
        toolboxTitlebar.addEventListener("pointermove", moveToolbox);
        const endToolboxDrag = (event) => {
            if (toolboxPointerId === null || (event !== undefined && event.pointerId !== toolboxPointerId)) {
                return;
            }
            if (event?.type === "pointerup")
                moveToolbox(event);
            const pointerId = toolboxPointerId;
            toolboxPointerId = null;
            if (toolboxTitlebar.hasPointerCapture(pointerId)) {
                toolboxTitlebar.releasePointerCapture(pointerId);
            }
        };
        toolboxTitlebar.addEventListener("pointerup", endToolboxDrag);
        toolboxTitlebar.addEventListener("pointercancel", endToolboxDrag);
        toolboxTitlebar.addEventListener("lostpointercapture", endToolboxDrag);
        window.addEventListener("blur", () => endToolboxDrag());
    }
    const applyModeChange = () => {
        if (!sourceReady)
            return;
        cancelGesture();
        if (screenButton?.checked === true) {
            selectScreen();
            return;
        }
        if (savedSelection !== null) {
            setSelection(savedSelection.x, savedSelection.y, savedSelection.width, savedSelection.height);
            setLocked(false);
        }
        else {
            resetInitialSelection();
        }
    };
    selectionButton?.addEventListener("change", applyModeChange);
    screenButton?.addEventListener("change", applyModeChange);
    electron_1.ipcRenderer.on("screen-capture:source", (_event, source) => {
        cancelGesture();
        sourceReady = false;
        if (captureButton !== null)
            captureButton.disabled = true;
        image.onload = () => {
            sourceReady = true;
            resetInitialSelection();
            if (screenButton?.checked === true)
                selectScreen();
            if (captureButton !== null)
                captureButton.disabled = false;
        };
        image.src = source.dataUrl;
    });
});
