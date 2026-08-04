import { ipcRenderer } from "electron";

type SourcePayload = {
    dataUrl: string;
};

type SelectionPayload = {
    x: number;
    y: number;
    width: number;
    height: number;
    renderedWidth: number;
    renderedHeight: number;
};

window.addEventListener("DOMContentLoaded", () => {
    const image = document.querySelector<HTMLImageElement>("#capture");
    const interaction = document.querySelector<HTMLDivElement>("#interaction");
    const selection = document.querySelector<HTMLDivElement>("#selection");
    const selectionButton = document.querySelector<HTMLButtonElement>("#selectionButton");
    const screenButton = document.querySelector<HTMLButtonElement>("#screenButton");
    const cancelButton = document.querySelector<HTMLButtonElement>("#cancelButton");
    const captureButton = document.querySelector<HTMLButtonElement>("#captureButton");

    if (image === null || interaction === null || selection === null) {
        return;
    }

    let selX = 0;
    let selY = 0;
    let selWidth = 0;
    let selHeight = 0;
    let locked = false;
    let savedSelection: { x: number; y: number; width: number; height: number } | null = null;

    const clamp = (value: number, min: number, max: number): number => {
        return Math.max(min, Math.min(max, value));
    };

    const getContentRect = (): { left: number; top: number; width: number; height: number } => {
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

    const getPoint = (event: PointerEvent): { x: number; y: number } => {
        const bounds = getContentRect();

        return {
            x: clamp(event.clientX - bounds.left, 0, bounds.width),
            y: clamp(event.clientY - bounds.top, 0, bounds.height)
        };
    };

    const isInsideSelection = (x: number, y: number): boolean => {
        return x >= selX && x <= selX + selWidth && y >= selY && y <= selY + selHeight;
    };

    const renderSelection = (): void => {
        const bounds = getContentRect();

        selection.style.left = `${bounds.left + selX}px`;
        selection.style.top = `${bounds.top + selY}px`;
        selection.style.width = `${selWidth}px`;
        selection.style.height = `${selHeight}px`;
        selection.hidden = selWidth < 2 || selHeight < 2;
    };

    const setSelection = (x: number, y: number, width: number, height: number): void => {
        selX = x;
        selY = y;
        selWidth = width;
        selHeight = height;
        renderSelection();
    };

    const resetInitialSelection = (): void => {
        const bounds = getContentRect();

        setSelection(
            (bounds.width - 200) / 2,
            (bounds.height - 200) / 2,
            200,
            200
        );
        setLocked(false);
        setActiveButton(selectionButton);
    };

    let mode: "move" | "draw" | "resize" = "move";
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let originW = 0;
    let originH = 0;
    let resizeDir = "";

    const updateCursor = (event: PointerEvent): void => {
        const point = getPoint(event);

        interaction.style.cursor = locked ? "default" : (isInsideSelection(point.x, point.y) ? "grab" : "crosshair");
    };

    const handles = selection.querySelectorAll<HTMLSpanElement>(".handle");

    const setLocked = (isLocked: boolean): void => {
        locked = isLocked;

        for (const handle of handles) {
            handle.style.display = isLocked ? "none" : "";
        }
    };

    const selectScreen = (): void => {
        const bounds = getContentRect();

        setSelection(
            (bounds.width - 600) / 2,
            (bounds.height - 600) / 2,
            600,
            600
        );
        setLocked(true);
    };

    const setActiveButton = (button: HTMLButtonElement | null): void => {
        for (const candidate of [selectionButton, screenButton]) {
            candidate?.classList.toggle("active", candidate === button);
        }
    };

    handles.forEach((handle) => {
        handle.addEventListener("pointerdown", (event) => {
            if (locked) {
                return;
            }

            const point = getPoint(event);

            mode = "resize";
            resizeDir = handle.dataset.dir ?? "";
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

    selectionButton?.addEventListener("click", () => {
        if (savedSelection !== null) {
            setSelection(savedSelection.x, savedSelection.y, savedSelection.width, savedSelection.height);
            setLocked(false);
            setActiveButton(selectionButton);
        } else {
            resetInitialSelection();
        }
    });

    screenButton?.addEventListener("click", () => {
        setActiveButton(screenButton);
        selectScreen();
    });

    ipcRenderer.on("screen-capture:source", (_event, source: SourcePayload) => {
        image.src = source.dataUrl;
        image.onload = resetInitialSelection;
    });
});
