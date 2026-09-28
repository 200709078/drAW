const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const ts = require("typescript");

const previousTsLoader = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    });
    module._compile(outputText, filename);
};

const { Document } = require("../src/document/Document.ts");
const { DocumentImage } = require("../src/document/DocumentImage.ts");
const { DrawingContext } = require("../src/models/DrawingContext.ts");
const { DocumentRenderer } = require("../src/renderers/DocumentRenderer.ts");
const { HistoryManager } = require("../src/core/HistoryManager.ts");
const { PointerManager } = require("../src/core/PointerManager.ts");
const { ToolManager } = require("../src/core/ToolManager.ts");
const { SelectionTool } = require("../src/tools/SelectionTool.ts");
const { PenTool } = require("../src/tools/PenTool.ts");

if (previousTsLoader === undefined) delete require.extensions[".ts"];
else require.extensions[".ts"] = previousTsLoader;

class ElementStub extends EventTarget {
    style = {};
    setAttribute() {}
    remove() {}
}

class CanvasStub extends ElementStub {
    captures = new Set();
    setPointerCapture(id) { this.captures.add(id); }
    hasPointerCapture(id) { return this.captures.has(id); }
    releasePointerCapture(id) { this.captures.delete(id); }
}

function fixture(t) {
    const previous = {
        window: Object.getOwnPropertyDescriptor(global, "window"),
        document: Object.getOwnPropertyDescriptor(global, "document")
    };
    global.window = new EventTarget();
    global.document = { createElement: () => new ElementStub(), body: { appendChild() {} } };
    const canvas = new CanvasStub();
    const context = new DrawingContext(canvas, {});
    const document = new Document();
    const image = new DocumentImage("data:image/png;base64,test", 100, 100, 400, 400);
    document.getCurrentPage().addImage(image);
    const renderer = new DocumentRenderer(context, document);
    // Keep real selection geometry and history; skip pixel rendering in Node.
    t.mock.method(renderer, "render", () => {});
    const history = new HistoryManager(document);
    const selection = new SelectionTool(context, document, renderer, history);
    const pen = new PenTool(context, document, renderer, history);
    const tools = new ToolManager();
    new PointerManager(canvas, tools, context.getViewport());
    tools.setTool(selection);
    t.after(() => {
        tools.getActiveTool().deactivate();
        for (const [key, descriptor] of Object.entries(previous)) {
            if (descriptor) Object.defineProperty(global, key, descriptor);
            else delete global[key];
        }
    });
    return {
        canvas, document, image, renderer, history, selection, pen, tools,
        send(type, id, x, y, pointerType = "touch") {
            canvas.dispatchEvent(Object.assign(new Event(type), {
                pointerId: id, pointerType, button: 0, pressure: 0.5,
                offsetX: x, offsetY: y, clientX: x, clientY: y,
                shiftKey: false, ctrlKey: false, metaKey: false
            }));
        }
    };
}

for (const pointerType of ["touch", "pen", "mouse"]) {
    for (const endEvent of ["pointerup", "pointercancel"]) {
        test(`selection accepts a new ${pointerType} gesture after ${endEvent} reaches another tool`, (t) => {
            const f = fixture(t);
            f.send("pointerdown", 1, 20, 20, pointerType);
            f.send("pointermove", 1, 60, 60, pointerType);
            f.tools.setTool(f.pen);
            f.send(endEvent, 1, 60, 60, pointerType);
            f.tools.setTool(f.selection);
            const nextId = pointerType === "mouse" ? 1 : 2;
            f.send("pointerdown", nextId, 250, 250, pointerType);
            f.send("pointerup", nextId, 250, 250, pointerType);

            assert.deepEqual(f.renderer.getSelectionBounds(), { minX: 100, minY: 100, maxX: 500, maxY: 500 });
            assert.equal(f.history.canUndo(), false);
            assert.equal(f.canvas.captures.size, 0);
        });
    }
}

for (const gesture of ["select", "drag", "resize"]) {
    test(`switching away and back during touch ${gesture} ends the old gesture and preserves undo`, (t) => {
        const f = fixture(t);
        if (gesture === "select") {
            f.send("pointerdown", 1, 20, 20);
            f.send("pointermove", 1, 60, 60);
        } else {
            f.selection.selectImage(f.image);
            if (gesture === "drag") {
                f.send("pointerdown", 1, 200, 100);
                f.send("pointermove", 1, 220, 130);
                f.send("pointermove", 1, 270, 160);
            } else {
                f.send("pointerdown", 1, 500, 500);
                f.send("pointermove", 1, 600, 600);
            }
        }
        const expected = f.document.createSnapshot();
        f.tools.setTool(f.pen);
        f.tools.setTool(f.selection);
        assert.equal(f.renderer.getSelectionBounds(), null);
        const marquee = t.mock.method(f.renderer, "setSelectionBounds");

        // The original finger is still on the canvas when selection becomes active again.
        f.send("pointermove", 1, 700, 700);
        f.send("pointerup", 1, 750, 750);
        assert.equal(marquee.mock.callCount(), 0, "the old touch must not redraw a selection rectangle");
        assert.equal(f.renderer.getSelectionBounds(), null, "the old touch must not select objects");
        assert.equal(f.document.snapshotsMatch(expected, f.document.createSnapshot()), true);
        assert.equal(f.history.canUndo(), gesture !== "select");

        if (gesture !== "select") {
            assert.equal(f.history.undo(), true);
            const restored = f.document.getCurrentPage().getImages()[0];
            assert.deepEqual([restored.getX(), restored.getY(), restored.getWidth(), restored.getHeight()], [100, 100, 400, 400]);
            assert.equal(f.history.canUndo(), false, "switching tools must not create extra undo entries");
        }
        f.send("pointerdown", 2, 250, 250);
        f.send("pointerup", 2, 250, 250);
        assert.deepEqual(f.renderer.getSelectionBounds(), { minX: 100, minY: 100, maxX: 500, maxY: 500 });
        assert.equal(f.canvas.captures.size, 0);
    });
}
