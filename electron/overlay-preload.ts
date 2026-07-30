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
    const selection = document.querySelector<HTMLDivElement>("#selection");

    if (image === null || selection === null) {
        return;
    }

    let startX = 0;
    let startY = 0;
    let isSelecting = false;

    const getPoint = (event: PointerEvent): { x: number; y: number } => {
        const bounds = image.getBoundingClientRect();

        return {
            x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
            y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top))
        };
    };

    const updateSelection = (endX: number, endY: number): void => {
        const bounds = image.getBoundingClientRect();
        const left = Math.min(startX, endX);
        const top = Math.min(startY, endY);

        selection.style.left = `${bounds.left + left}px`;
        selection.style.top = `${bounds.top + top}px`;
        selection.style.width = `${Math.abs(endX - startX)}px`;
        selection.style.height = `${Math.abs(endY - startY)}px`;
    };

    image.addEventListener("pointerdown", (event) => {
        const point = getPoint(event);

        startX = point.x;
        startY = point.y;
        isSelecting = true;
        selection.hidden = false;
        updateSelection(startX, startY);
        image.setPointerCapture(event.pointerId);
    });

    image.addEventListener("pointermove", (event) => {
        if (isSelecting) {
            const point = getPoint(event);

            updateSelection(point.x, point.y);
        }
    });

    image.addEventListener("pointerup", (event) => {
        if (!isSelecting) {
            return;
        }

        isSelecting = false;
        const point = getPoint(event);
        const bounds = image.getBoundingClientRect();
        const width = Math.abs(point.x - startX);
        const height = Math.abs(point.y - startY);

        if (image.hasPointerCapture(event.pointerId)) {
            image.releasePointerCapture(event.pointerId);
        }

        if (width >= 2 && height >= 2) {
            ipcRenderer.send("screen-capture:complete", {
                x: Math.min(startX, point.x),
                y: Math.min(startY, point.y),
                width,
                height,
                renderedWidth: bounds.width,
                renderedHeight: bounds.height
            });
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            ipcRenderer.send("screen-capture:cancel");
        }
    });

    ipcRenderer.on("screen-capture:source", (_event, source: SourcePayload) => {
        image.src = source.dataUrl;
    });
});
