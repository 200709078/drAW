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
const { EraserIdleReturn } = require("../src/core/EraserIdleReturn.ts");
const { ToolManager } = require("../src/core/ToolManager.ts");
if (previousTsLoader === undefined) delete require.extensions[".ts"];
else require.extensions[".ts"] = previousTsLoader;

function fixture(t, initialEraser = null) {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const manager = new ToolManager();
    const erasers = [0, 1].map(() => ({ activate() {}, deactivate() {} }));
    const pen = { activate() {}, deactivate() {} };
    const other = { activate() {}, deactivate() {} };
    const input = new EventTarget();
    const focus = new EventTarget();
    if (initialEraser !== null) manager.setTool(erasers[initialEraser]);
    new EraserIdleReturn(manager, erasers, () => manager.setTool(pen), input, focus);
    t.after(() => manager.setTool(other));
    return {
        manager, erasers, pen, other, focus,
        tick: (ms) => t.mock.timers.tick(ms),
        send: (type, pointerId = 1, pointerType = "touch") => {
            input.dispatchEvent(Object.assign(new Event(type), { pointerId, pointerType }));
        }
    };
}

for (const index of [0, 1]) {
    test(`eraser ${index}: returns to normal pen after exactly four idle seconds, including later selections`, (t) => {
        const f = fixture(t);
        for (let attempt = 0; attempt < 2; attempt++) {
            f.manager.setTool(f.erasers[index]);
            f.tick(3999);
            assert.equal(f.manager.getActiveTool(), f.erasers[index]);
            f.tick(1);
            assert.equal(f.manager.getActiveTool(), f.pen);
        }
    });
}

test("an eraser selected before registration also returns to the pen", (t) => {
    const f = fixture(t, 0);
    f.tick(4000);
    assert.equal(f.manager.getActiveTool(), f.pen);
});

for (const type of ["pointermove", "click", "keydown", "wheel"]) {
    test(`${type} restarts the full idle interval`, (t) => {
        const f = fixture(t, 0);
        f.tick(3500);
        f.send(type);
        f.tick(3999);
        assert.equal(f.manager.getActiveTool(), f.erasers[0]);
        f.tick(1);
        assert.equal(f.manager.getActiveTool(), f.pen);
    });
}

for (const pointerType of ["touch", "pen", "mouse"]) {
    test(`${pointerType}: a held contact cannot change the eraser, even without movement`, (t) => {
        const f = fixture(t, 0);
        f.tick(3000);
        f.send("pointerdown", 1, pointerType);
        f.tick(10000);
        assert.equal(f.manager.getActiveTool(), f.erasers[0]);
        f.send("pointermove", 1, pointerType);
        f.tick(5000);
        assert.equal(f.manager.getActiveTool(), f.erasers[0]);
        f.send("pointerup", 1, pointerType);
        f.tick(3999);
        assert.equal(f.manager.getActiveTool(), f.erasers[0]);
        f.tick(1);
        assert.equal(f.manager.getActiveTool(), f.pen);
    });
}

for (const endType of ["pointerup", "pointercancel", "lostpointercapture"]) {
    test(`${endType}: all contacts must finish before the countdown starts`, (t) => {
        const f = fixture(t, 1);
        f.send("pointerdown", 1);
        f.send("pointerdown", 2);
        f.send(endType, 1);
        f.tick(5000);
        assert.equal(f.manager.getActiveTool(), f.erasers[1]);
        f.send(endType, 2);
        f.tick(3999);
        assert.equal(f.manager.getActiveTool(), f.erasers[1]);
        f.tick(1);
        assert.equal(f.manager.getActiveTool(), f.pen);
    });
}

test("changing eraser type restarts the interval; choosing another tool cancels it", (t) => {
    const f = fixture(t, 0);
    f.tick(3000);
    f.manager.setTool(f.erasers[1]);
    f.tick(3999);
    assert.equal(f.manager.getActiveTool(), f.erasers[1]);
    f.manager.setTool(f.other);
    f.tick(10000);
    assert.equal(f.manager.getActiveTool(), f.other);
});

test("contact lost outside the window cannot leave the timer permanently suspended", (t) => {
    const f = fixture(t, 0);
    f.send("pointerdown");
    f.focus.dispatchEvent(new Event("blur"));
    f.tick(3999);
    assert.equal(f.manager.getActiveTool(), f.erasers[0]);
    f.tick(1);
    assert.equal(f.manager.getActiveTool(), f.pen);
});
