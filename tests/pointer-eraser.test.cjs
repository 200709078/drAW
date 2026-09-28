const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const ts = require("typescript");

// Load the application TypeScript in Node without generating build files.
const previousTsLoader = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    });
    module._compile(outputText, filename);
};

const { Document } = require("../src/document/Document.ts");
const { Point } = require("../src/document/Point.ts");
const { Stroke } = require("../src/document/Stroke.ts");
const { DrawingContext } = require("../src/models/DrawingContext.ts");
const { HistoryManager } = require("../src/core/HistoryManager.ts");
const { PointerManager } = require("../src/core/PointerManager.ts");
const { EraserTool } = require("../src/tools/EraserTool.ts");
const { PartialEraserTool } = require("../src/tools/PartialEraserTool.ts");

if (previousTsLoader === undefined) {
    delete require.extensions[".ts"];
} else {
    require.extensions[".ts"] = previousTsLoader;
}

class CanvasStub extends EventTarget {
    style = {};
    captures = new Set();

    setPointerCapture(id) { this.captures.add(id); }
    hasPointerCapture(id) { return this.captures.has(id); }
    releasePointerCapture(id) { this.captures.delete(id); }
}

function pointerEvent(type, id, x, y, pointerType = "touch") {
    return Object.assign(new Event(type), {
        pointerId: id, pointerType, button: 0,
        offsetX: x, offsetY: y, clientX: x, clientY: y
    });
}

function createFixture(ToolClass) {
    const canvas = new CanvasStub();
    const context = new DrawingContext(canvas, {});
    const document = new Document();
    const history = new HistoryManager(document);
    const tool = new ToolClass(context, document, { render() {} }, history);
    new PointerManager(canvas, { getActiveTool: () => tool }, context.getViewport());

    return {
        canvas, document, history, tool,
        send: (type, id, x, y, pointerType) => {
            canvas.dispatchEvent(pointerEvent(type, id, x, y, pointerType));
        }
    };
}

function addStroke(document, x, y) {
    const stroke = new Stroke();
    stroke.addPoint(new Point(x, y, 1));
    document.getCurrentPage().addStroke(stroke);
}

for (const ToolClass of [EraserTool, PartialEraserTool]) {
    for (const firstId of [1, 2]) {
        for (const firstEnd of ["pointerup", "pointercancel"]) {
            test(`${ToolClass.name}: pinch ending with ${firstEnd} on pointer ${firstId} preserves drawing`, () => {
                const { canvas, document, history, send } = createFixture(ToolClass);
                addStroke(document, 300, 300);

                send("pointerdown", 1, 50, 50);
                send("pointerdown", 2, 200, 200);
                send(firstEnd, firstId, firstId === 1 ? 50 : 200, firstId === 1 ? 50 : 200);
                const remainingId = firstId === 1 ? 2 : 1;
                send("pointermove", remainingId, 300, 300);
                send("pointerup", remainingId, 300, 300);

                assert.equal(document.getCurrentPage().getStrokes().length, 1);
                assert.equal(history.canUndo(), false);
                assert.equal(canvas.captures.size, 0);

                // A fresh gesture must still erase and remain undoable.
                send("pointerdown", 3, 300, 300);
                send("pointerup", 3, 300, 300);
                assert.equal(document.getCurrentPage().getStrokes().length, 0);
                assert.equal(history.undo(), true);
                assert.equal(document.getCurrentPage().getStrokes().length, 1);
            });
        }
    }

    test(`${ToolClass.name}: erasing before pinch remains undoable`, () => {
        const { document, history, send } = createFixture(ToolClass);
        addStroke(document, 100, 100);
        addStroke(document, 300, 300);

        send("pointerdown", 1, 100, 100);
        send("pointerdown", 2, 300, 300);
        send("pointerup", 1, 100, 100);
        send("pointerup", 2, 300, 300);

        assert.equal(document.getCurrentPage().getStrokes().length, 1);
        assert.equal(history.undo(), true);
        assert.equal(document.getCurrentPage().getStrokes().length, 2);
        assert.equal(history.canUndo(), false);
    });

    test(`${ToolClass.name}: ignores release without a matching active erase gesture`, () => {
        const { document, history, tool } = createFixture(ToolClass);
        addStroke(document, 300, 300);

        tool.onPointerUp(pointerEvent("pointerup", 1, 300, 300));
        assert.equal(document.getCurrentPage().getStrokes().length, 1);
        tool.onPointerDown(pointerEvent("pointerdown", 1, 50, 50));
        tool.onPointerUp(pointerEvent("pointerup", 2, 300, 300));
        assert.equal(document.getCurrentPage().getStrokes().length, 1);
        tool.cancel();
        tool.onPointerUp(pointerEvent("pointerup", 1, 300, 300));

        assert.equal(document.getCurrentPage().getStrokes().length, 1);
        assert.equal(history.canUndo(), false);
    });

    test(`${ToolClass.name}: normal mouse release erases at the final position and supports undo`, () => {
        const { document, history, send } = createFixture(ToolClass);
        addStroke(document, 300, 300);

        send("pointerdown", 1, 50, 50, "mouse");
        send("pointerup", 1, 300, 300, "mouse");

        assert.equal(document.getCurrentPage().getStrokes().length, 0);
        assert.equal(history.undo(), true);
        assert.equal(document.getCurrentPage().getStrokes().length, 1);
    });
}

test("pinch zoom works and keeps remaining contacts away from the active tool", () => {
    const canvas = new CanvasStub();
    const viewport = new DrawingContext(canvas, {}).getViewport();
    const calls = [];
    const tool = {
        onPointerDown() { calls.push("down"); },
        onPointerMove() { calls.push("move"); },
        onPointerUp() { calls.push("up"); },
        onPointerCancel() { calls.push("cancel"); },
        interruptGesture() { calls.push("interrupt"); }
    };
    new PointerManager(canvas, { getActiveTool: () => tool }, viewport);
    const send = (type, id, x, y) => canvas.dispatchEvent(pointerEvent(type, id, x, y));

    send("pointerdown", 1, 100, 100);
    send("pointerdown", 2, 200, 100);
    send("pointermove", 2, 300, 100);
    assert.equal(viewport.getScale(), 2);
    send("pointerup", 1, 100, 100);
    send("pointermove", 2, 400, 100);
    send("pointermove", 2, 450, 100);
    send("pointercancel", 2, 450, 100);

    assert.deepEqual(calls, ["down", "interrupt"]);
    assert.equal(viewport.getScale(), 2);
    assert.equal(canvas.captures.size, 0);
    send("pointerdown", 3, 50, 50);
    send("pointerup", 3, 50, 50);
    assert.deepEqual(calls, ["down", "interrupt", "down", "up"]);
});
