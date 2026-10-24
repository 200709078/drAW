// Generated from quick-capture/selection.ts by scripts/build-preloads.mjs.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
window.addEventListener("DOMContentLoaded", () => {
    const snapshot = document.getElementById("snapshot");
    const surface = document.getElementById("surface");
    const outline = document.getElementById("outline");
    const cancel = document.getElementById("cancel");
    let ready = false;
    let finished = false;
    let pointer = null;
    let start = { x: 0, y: 0 };
    function imageBounds() {
        const ratio = Math.min(innerWidth / snapshot.naturalWidth, innerHeight / snapshot.naturalHeight);
        const width = snapshot.naturalWidth * ratio;
        const height = snapshot.naturalHeight * ratio;
        return { x: (innerWidth - width) / 2, y: (innerHeight - height) / 2, width, height };
    }
    function position(event) {
        const b = imageBounds();
        return { x: Math.max(b.x, Math.min(b.x + b.width, event.clientX)),
            y: Math.max(b.y, Math.min(b.y + b.height, event.clientY)) };
    }
    function reset() {
        const id = pointer;
        pointer = null;
        outline.hidden = true;
        document.body.classList.remove("selecting");
        if (id !== null && surface.hasPointerCapture(id))
            surface.releasePointerCapture(id);
    }
    function abort() {
        if (finished)
            return;
        finished = true;
        reset();
        electron_1.ipcRenderer.send("quick-capture:abort");
    }
    function update(event) {
        const end = position(event);
        const rect = { left: Math.min(start.x, end.x), top: Math.min(start.y, end.y),
            right: Math.max(start.x, end.x), bottom: Math.max(start.y, end.y) };
        Object.assign(outline.style, { left: `${rect.left}px`, top: `${rect.top}px`,
            width: `${rect.right - rect.left}px`, height: `${rect.bottom - rect.top}px` });
        return rect;
    }
    surface.addEventListener("pointerdown", (event) => {
        if (!ready || finished || pointer !== null || event.button !== 0)
            return;
        const b = imageBounds();
        if (event.clientX < b.x || event.clientX > b.x + b.width ||
            event.clientY < b.y || event.clientY > b.y + b.height)
            return;
        event.preventDefault();
        pointer = event.pointerId;
        start = position(event);
        surface.setPointerCapture(pointer);
        document.body.classList.add("selecting");
        outline.hidden = false;
        update(event);
    });
    surface.addEventListener("pointermove", (event) => {
        if (event.pointerId !== pointer)
            return;
        event.preventDefault();
        update(event);
    });
    surface.addEventListener("pointerup", (event) => {
        if (event.pointerId !== pointer)
            return;
        event.preventDefault();
        const rect = update(event);
        const b = imageBounds();
        reset();
        // Tek dokunuşu alıntıya dönüştürme; yeniden seçim yapılabilir.
        if (rect.right - rect.left < 3 || rect.bottom - rect.top < 3)
            return;
        finished = true;
        electron_1.ipcRenderer.send("quick-capture:selection", {
            left: (rect.left - b.x) / b.width, top: (rect.top - b.y) / b.height,
            right: (rect.right - b.x) / b.width, bottom: (rect.bottom - b.y) / b.height
        });
    });
    for (const type of ["pointercancel", "lostpointercapture"]) {
        surface.addEventListener(type, (event) => {
            if (event.pointerId === pointer)
                reset();
        });
    }
    cancel.addEventListener("click", abort);
    window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            abort();
        }
    });
    window.addEventListener("blur", reset);
    window.addEventListener("resize", reset);
    window.addEventListener("contextmenu", (event) => event.preventDefault());
    electron_1.ipcRenderer.once("quick-capture:image", async (_event, png) => {
        snapshot.src = URL.createObjectURL(new Blob([png], { type: "image/png" }));
        try {
            await snapshot.decode();
        }
        catch {
            electron_1.ipcRenderer.send("quick-capture:failed");
            return;
        }
        // Görüntü boyanmadan gösterilen pencere bir an beyaz kalır. Gizli pencerede kare
        // üretilmezse kısa süre sonra yine de gösterilir.
        await Promise.race([
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
            new Promise((resolve) => setTimeout(resolve, 100))
        ]);
        ready = true;
        electron_1.ipcRenderer.send("quick-capture:shown");
    });
});
