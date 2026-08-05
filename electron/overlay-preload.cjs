const { ipcRenderer } = require("electron");

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
    let savedSelection = null;

    const clamp = (value, min, max) => {
        return Math.max(min, Math.min(max, value));
    };

    const getContentRect = () => {
        const bounds = image.getBoundingClientRect();
        const scale = Math.min(
            bounds.width / image.naturalWidth,
            bounds.height / image.naturalHeight
        );
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

    const setLocked = (isLocked) => {
        locked = isLocked;

        for (const handle of handles) {
            handle.style.display = isLocked ? "none" : "";
        }
    };

    const selectScreen = () => {
        const bounds = getContentRect();
        const margin = 1;

        setSelection(
            margin,
            margin,
            bounds.width - margin * 2,
            bounds.height - margin * 2
        );

        setLocked(true);
    };


    const resetInitialSelection = () => {
        const bounds = getContentRect();

        setSelection(
            (bounds.width - 200) / 2,
            (bounds.height - 200) / 2,
            200,
            200
        );
        setLocked(false);
    };

    let mode = "move";
    let isDragging = false;
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

    handles.forEach((handle) => {
        handle.addEventListener("pointerdown", (event) => {
            if (locked) {
                return;
            }

            const point = getPoint(event);

            mode = "resize";
            resizeDir = handle.dataset.dir || "";
            startX = point.x;
            startY = point.y;
            originX = selX;
            originY = selY;
            originW = selWidth;
            originH = selHeight;
            isDragging = true;
            interaction.setPointerCapture(event.pointerId);
        });
    });

    interaction.addEventListener("pointerdown", (event) => {
        const point = getPoint(event);

        if (locked) {
            return;
        }

        if (!isInsideSelection(point.x, point.y)) {
            mode = "draw";
            startX = point.x;
            startY = point.y;
            setSelection(point.x, point.y, 0, 0);
        } else {
            mode = "move";
            startX = point.x;
            startY = point.y;
            originX = selX;
            originY = selY;
        }

        isDragging = true;
        interaction.setPointerCapture(event.pointerId);
    });

    interaction.addEventListener("pointermove", (event) => {
        if (!isDragging) {
            updateCursor(event);
            return;
        }

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
                left = originX + dx;
            }
            if (dir.includes("e")) {
                right = originX + originW + dx;
            }
            if (dir.includes("n")) {
                top = originY + dy;
            }
            if (dir.includes("s")) {
                bottom = originY + originH + dy;
            }

            left = clamp(left, 0, bounds.width - minSize);
            top = clamp(top, 0, bounds.height - minSize);
            right = clamp(right, minSize, bounds.width);
            bottom = clamp(bottom, minSize, bounds.height);

            if (right - left < minSize) {
                right = left + minSize;
            }
            if (bottom - top < minSize) {
                bottom = top + minSize;
            }

            setSelection(left, top, right - left, bottom - top);
        } else if (mode === "move") {
            const bounds = getContentRect();

            setSelection(
                clamp(originX + point.x - startX, 0, bounds.width - selWidth),
                clamp(originY + point.y - startY, 0, bounds.height - selHeight),
                selWidth,
                selHeight
            );
        } else {
            setSelection(
                Math.min(startX, point.x),
                Math.min(startY, point.y),
                Math.abs(point.x - startX),
                Math.abs(point.y - startY)
            );
        }
    });

    interaction.addEventListener("pointerup", (event) => {
        if (!isDragging) {
            return;
        }

        isDragging = false;

        if (interaction.hasPointerCapture(event.pointerId)) {
            interaction.releasePointerCapture(event.pointerId);
        }

        if (mode === "draw" && (selWidth < 10 || selHeight < 10)) {
            const bounds = getContentRect();

            setSelection(
                clamp(startX, 0, Math.max(0, bounds.width - 30)),
                clamp(startY, 0, Math.max(0, bounds.height - 30)),
                30,
                30
            );
        }

        if (selWidth >= 2 && selHeight >= 2) {
            savedSelection = { x: selX, y: selY, width: selWidth, height: selHeight };
        }

        updateCursor(event);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            ipcRenderer.send("screen-capture:cancel");
        }
    });

    document.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });

    cancelButton?.addEventListener("click", () => {
        ipcRenderer.send("screen-capture:cancel");
    });

    captureButton?.addEventListener("click", () => {
        if (selWidth < 2 || selHeight < 2) {
            return;
        }

        const bounds = getContentRect();

        ipcRenderer.send("screen-capture:complete", {
            x: selX,
            y: selY,
            width: selWidth,
            height: selHeight,
            renderedWidth: bounds.width,
            renderedHeight: bounds.height
        });
    });

    const toolbox = document.querySelector("#toolbox");
    const toolboxTitlebar = toolbox?.querySelector(".toolbox__titlebar");

    if (toolbox !== null && toolboxTitlebar !== null) {
        let toolboxDragging = false;
        let toolboxOffsetX = 0;
        let toolboxOffsetY = 0;

        toolboxTitlebar.addEventListener("pointerdown", (event) => {
            if (event.button !== 0) {
                return;
            }
            if (event.target instanceof HTMLElement && event.target.closest(".toolbox__close") !== null) {
                return;
            }
            toolboxDragging = true;
            toolboxOffsetX = event.clientX - toolbox.getBoundingClientRect().left;
            toolboxOffsetY = event.clientY - toolbox.getBoundingClientRect().top;
            toolboxTitlebar.setPointerCapture(event.pointerId);
        });

        toolboxTitlebar.addEventListener("pointermove", (event) => {
            if (!toolboxDragging) {
                return;
            }
            const left = clamp(
                event.clientX - toolboxOffsetX,
                0,
                Math.max(0, window.innerWidth - toolbox.offsetWidth)
            );
            const top = clamp(
                event.clientY - toolboxOffsetY,
                0,
                Math.max(0, window.innerHeight - toolbox.offsetHeight)
            );
            toolbox.style.left = `${left}px`;
            toolbox.style.top = `${top}px`;
            toolbox.style.bottom = "auto";
            toolbox.style.transform = "none";
        });

        const endToolboxDrag = (event) => {
            if (!toolboxDragging) {
                return;
            }
            toolboxDragging = false;
            if (toolboxTitlebar.hasPointerCapture(event.pointerId)) {
                toolboxTitlebar.releasePointerCapture(event.pointerId);
            }
        };

        toolboxTitlebar.addEventListener("pointerup", endToolboxDrag);
        toolboxTitlebar.addEventListener("pointercancel", endToolboxDrag);
    }

    const applyModeChange = () => {
        if (screenButton?.checked === true) {
            selectScreen();

            return;
        }

        if (savedSelection !== null) {
            setSelection(savedSelection.x, savedSelection.y, savedSelection.width, savedSelection.height);
            setLocked(false);
        } else {
            resetInitialSelection();
        }
    };

    selectionButton?.addEventListener("change", applyModeChange);
    screenButton?.addEventListener("change", applyModeChange);

    ipcRenderer.on("screen-capture:source", (_event, source) => {
        image.src = source.dataUrl;
        image.onload = resetInitialSelection;
    });
});
