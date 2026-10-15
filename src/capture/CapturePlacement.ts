type Bounds = { left: number; top: number; right: number; bottom: number };

export function fitScreenCapture(
    width: number, height: number, canvas: Bounds, toolbar: Bounds | null,
    dock: "left" | "top" | "bottom", zoom: number, margin: number
): { x: number; y: number; width: number; height: number } {
    let left = canvas.left + margin;
    let top = canvas.top + margin;
    const right = canvas.right - margin;
    let bottom = canvas.bottom - margin;
    if (toolbar && toolbar.right > canvas.left && toolbar.left < canvas.right &&
        toolbar.bottom > canvas.top && toolbar.top < canvas.bottom) {
        if (dock === "left") left = Math.max(left, toolbar.right + margin);
        else if (dock === "top") top = Math.max(top, toolbar.bottom + margin);
        else bottom = Math.min(bottom, toolbar.top - margin);
    }
    const factor = Math.min(1, Math.max(1, right - left) / (width * zoom),
        Math.max(1, bottom - top) / (height * zoom));
    return { x: left - canvas.left, y: top - canvas.top, width: width * factor, height: height * factor };
}
