const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { EventEmitter } = require("node:events");
const { test } = require("node:test");
const ts = require("typescript");

function load(file, overrides = {}, globals = {}) {
    const source = readFileSync(`${__dirname}/../${file}`, "utf8").replaceAll("import.meta.url", JSON.stringify(__filename));
    const code = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
    }).outputText;
    const module = { exports: {} };
    new Function("require", "module", "exports", ...Object.keys(globals), code)(
        (name) => overrides[name] ?? require(name), module, module.exports, ...Object.values(globals));
    return module.exports;
}

const geometry = load("electron/quick-capture/geometry.ts");
const { pixelSelection } = geometry;

test("fractional selections map to native pixels with no titlebar or work-area subtraction", () => {
    assert.deepEqual(pixelSelection({ left: .1, top: .2, right: .7, bottom: .6 }, 3840, 2160),
        { x: 384, y: 432, width: 2304, height: 864 });
    assert.deepEqual(pixelSelection({ left: 0, top: 0, right: 1, bottom: 1 }, 1920, 1080),
        { x: 0, y: 0, width: 1920, height: 1080 });
});

for (const rect of [null, {}, { left: -1, top: 0, right: 1, bottom: 1 },
    { left: 0, top: 0, right: 1.01, bottom: 1 }, { left: NaN, top: 0, right: 1, bottom: 1 },
    { left: "0", top: 0, right: 1, bottom: 1 }, { left: 1, top: 0, right: 0, bottom: 1 },
    { left: 0, top: 0, right: .000001, bottom: 1 }]) {
    test(`reject malformed/empty selection ${JSON.stringify(rect)}`, () => assert.equal(pixelSelection(rect, 1920, 1080), null));
}

function fixture({ scale = 1, platform = "linux", displayId = 7, bounds = { x: 0, y: 0, width: 1920, height: 1080 } } = {}) {
    const handlers = new Map();
    const windows = [];
    const actions = [];
    const timers = new Map();
    let clock = 0;
    let sequence = 0;
    let requested;
    let capture = async () => [{ display_id: String(displayId), thumbnail: image(bounds.width * scale, bounds.height * scale) }];
    const display = { id: displayId, bounds, workArea: { ...bounds, height: bounds.height - 64 }, scaleFactor: scale };
    const displays = [display];
    const screen = Object.assign(new EventEmitter(), { getDisplayMatching: () => display, getAllDisplays: () => displays });
    function image(width, height) {
        return {
            isEmpty: () => width === 0,
            getSize: () => ({ width, height }),
            toPNG: () => Buffer.from(JSON.stringify({ width, height })),
            toDataURL: () => `data:image/png;base64,${Buffer.from(`${width}x${height}`).toString("base64")}`,
            crop(rect) { actions.push(["crop", rect]); return image(rect.width, rect.height); }
        };
    }
    class Window extends EventEmitter {
        constructor(options = {}) {
            super();
            this.options = options;
            this.destroyed = false;
            this.visible = options.show !== false;
            this.webContents = Object.assign(new EventEmitter(), {
                id: windows.length + 1, mainFrame: {},
                send: (name, value) => actions.push(["send", name, value]),
                setWindowOpenHandler: () => {}
            });
            windows.push(this);
        }
        static fromWebContents(sender) { return windows.find((w) => w.webContents === sender) ?? null; }
        getBounds() { return bounds; }
        isVisible() { return this.visible; }
        isDestroyed() { return this.destroyed; }
        hide() { this.visible = false; actions.push(["hide", this]); }
        show() { assert(!this.destroyed); this.visible = true; actions.push(["show", this]); }
        focus() { actions.push(["focus", this]); }
        setMenu() {}
        setAlwaysOnTop() {}
        loadFile(file) { this.file = file; return Promise.resolve(); }
        destroy() { this.destroyed = true; this.emit("closed"); }
    }
    const electron = {
        BrowserWindow: Window, screen,
        nativeImage: { createFromBuffer(buffer) { const { width, height } = JSON.parse(buffer); return image(width, height); } },
        desktopCapturer: { getSources(options) {
            assert.equal(owner.visible, false, "source must be acquired after drAW hides");
            actions.push(["capture"]);
            requested = options;
            return capture();
        } }
    };
    const { QuickCaptureService } = load("electron/quick-capture/service.ts", {
        "node:module": { createRequire: () => () => electron }, "./geometry.ts": geometry
    }, {
        process: { platform },
        setTimeout: (callback, ms) => { const id = ++sequence; timers.set(id, { callback, at: clock + ms }); return id; },
        clearTimeout: (id) => timers.delete(id)
    });
    const service = new QuickCaptureService("/new-capture");
    service.register({ handle: (key, handler) => handlers.set(key, handler), on: (key, handler) => handlers.set(key, handler) });
    const owner = new Window();
    service.allowWindow(owner);
    const event = (window = owner) => ({ sender: window.webContents, senderFrame: window.webContents.mainFrame });
    const send = (name, value, window = windows[1]) => handlers.get(`quick-capture:${name}`)(event(window), value);
    return {
        owner, windows, screen, displays, actions, timers, service, image, event, handlers,
        requested: () => requested,
        capture: (fn) => { capture = fn; },
        start: (mode = "screen", e = event()) => handlers.get("quick-capture:take")(e, mode), send,
        async advance(ms = 200) {
            clock += ms;
            for (const [id, timer] of [...timers]) {
                if (timer.at <= clock) { timers.delete(id); timer.callback(); }
            }
            for (let i = 0; i < 8; i++) await Promise.resolve();
        },
        ready() { send("ready"); send("shown"); }
    };
}

for (const platform of ["linux", "win32"]) {
    for (const scale of [1, 1.25, 1.5, 2]) {
        test(`${platform} scale ${scale}: full screen retains native dimensions without opening selection`, async () => {
            const f = fixture({ platform, scale });
            const promise = f.start();
            await f.advance();
            const reply = await promise;
            assert.equal(reply.status, "ok");
            assert.equal(reply.image.width, 1920 * scale);
            assert.equal(reply.image.height, 1080 * scale);
            assert.equal(f.windows.length, 1);
            assert.equal(f.owner.visible, true);
            assert.deepEqual(f.requested().thumbnailSize, { width: 1920 * scale, height: 1080 * scale });
            assert.equal(f.timers.size, 0);
            assert.equal(f.screen.listenerCount("display-metrics-changed"), 0);
        });
    }
}

for (const mode of ["screen", "area"]) {
    test(`Linux X11 ${mode}: matches the truncated display ID observed on the PC`, async () => {
        const f = fixture({ displayId: 1881264395124801, scale: 1.25,
            bounds: { x: 0, y: 0, width: 1536, height: 864 } });
        // Two equally sized monitors: source order and dimensions cannot identify the target.
        let targetRead = false;
        const target = f.image(1920, 1080);
        const toPNG = target.toPNG;
        target.toPNG = () => { targetRead = true; return toPNG(); };
        f.capture(async () => [
            { display_id: "66", thumbnail: f.image(1920, 1080) },
            { display_id: "65", thumbnail: target }
        ]);
        const promise = f.start(mode);
        await f.advance();
        if (mode === "area") {
            assert.equal(f.windows.length, 2, "matching the X11 source must open selection");
            f.ready();
            f.send("selection", { left: .25, top: .25, right: .75, bottom: .75 });
        }
        const reply = await promise;
        assert.equal(reply.status, "ok");
        assert.equal(targetRead, true, "must use the matching source, not the first equally sized screen");
        assert.equal(reply.image.width, mode === "screen" ? 1920 : 960);
        assert.equal(reply.image.height, mode === "screen" ? 1080 : 540);
        assert.equal(f.owner.visible, true);
    });
}

test("exact display ID takes precedence over a truncated Linux ID", async () => {
    const f = fixture({ displayId: 1881264395124801 });
    f.capture(async () => [
        { display_id: "65", thumbnail: f.image(960, 540) },
        { display_id: "1881264395124801", thumbnail: f.image(1920, 1080) }
    ]);
    const promise = f.start();
    await f.advance();
    assert.equal((await promise).status, "ok");
});

for (const mode of ["screen", "area"]) {
    for (const displayId of [1881264395124801, Number.MAX_SAFE_INTEGER + 1]) {
        test(`Linux single-monitor ${mode}: accepts a sole native source with unrelated ID (${displayId})`, async () => {
            const f = fixture({ displayId, scale: 2 });
            f.capture(async () => [{ display_id: "0", thumbnail: f.image(3840, 2160) }]);
            const promise = f.start(mode);
            await f.advance();
            if (mode === "area") {
                assert.equal(f.windows.length, 2, "a valid sole screen must reach area selection");
                f.ready();
                f.send("selection", { left: .25, top: .25, right: .75, bottom: .75 });
            }
            const reply = await promise;
            assert.equal(reply.status, "ok", reply.message);
            assert.equal(reply.image.width, mode === "screen" ? 3840 : 1920);
            assert.equal(reply.image.height, mode === "screen" ? 2160 : 1080);
            assert.equal(f.owner.visible, true);
        });
    }
}

for (const issue of ["second-display", "replaced-display", "empty-image", "downscaled-image"]) {
    test(`Linux single-monitor fallback rejects ${issue}`, async () => {
        const f = fixture();
        if (issue === "second-display") f.displays.push({ ...f.displays[0], id: 8 });
        if (issue === "replaced-display") f.displays.splice(0, 1, { ...f.displays[0], id: 8 });
        f.capture(async () => [{ display_id: "0", thumbnail: f.image(
            issue === "empty-image" ? 0 : issue === "downscaled-image" ? 960 : 1920,
            issue === "downscaled-image" ? 540 : 1080
        ) }]);
        const promise = f.start("area");
        await f.advance();
        const reply = await promise;
        assert.equal(reply.status, "error");
        const expected = issue === "empty-image" ? /boş/ : issue === "downscaled-image" ? /özgün çözünürlük/ : /eşleştirilemedi/;
        assert.match(reply.message, expected);
        assert.equal(f.windows.length, 1, "invalid source must not open selection");
        assert.equal(f.owner.visible, true);
    });
}

for (const issue of ["windows", "unrelated", "ambiguous", "empty-image"]) {
    test(`X11 ID compatibility rejects ${issue} sources`, async () => {
        const f = fixture({ displayId: 1881264395124801, platform: issue === "windows" ? "win32" : "linux" });
        if (issue === "unrelated") f.displays.push({ ...f.displays[0], id: 8 });
        f.capture(async () => {
            const source = { display_id: issue === "unrelated" ? "66" : "65", thumbnail: f.image(issue === "empty-image" ? 0 : 1920, 1080) };
            return issue === "ambiguous" ? [source, { ...source }] : [source];
        });
        const promise = f.start();
        await f.advance();
        assert.equal((await promise).status, "error");
        assert.equal(f.owner.visible, true);
    });
}

test("area capture uses a separate ready window, original bitmap and correct multi-monitor coordinates", async () => {
    const f = fixture({ scale: 2, bounds: { x: -1920, y: 120, width: 1920, height: 1080 } });
    const promise = f.start("area");
    await f.advance();
    assert.equal(f.owner.visible, false);
    const overlay = f.windows[1];
    assert.equal(overlay.visible, false);
    assert.equal(overlay.options.x, -1920);
    assert.equal(overlay.options.y, 120);
    assert.equal(overlay.options.frame, false);
    assert.equal(overlay.options.height, 1080);
    assert(overlay.file.endsWith("/new-capture/selection.html"));
    f.ready();
    assert.equal(overlay.visible, true);
    assert.equal(f.timers.size, 0);
    f.send("selection", { left: .25, top: .25, right: .75, bottom: .75 });
    const reply = await promise;
    assert.equal(reply.status, "ok");
    assert.deepEqual(f.actions.find((a) => a[0] === "crop")[1], { x: 960, y: 540, width: 1920, height: 1080 });
    assert.equal(reply.image.width, 1920);
    assert.equal(reply.image.height, 1080);
    assert.equal(overlay.destroyed, true);
    assert.equal(f.owner.visible, true);
});

for (const reason of ["abort", "close", "blur", "display-change", "crash", "failed", "timeout", "navigation"]) {
    test(`restores main window and accepts another request after ${reason}`, async () => {
        const f = fixture();
        const promise = f.start("area");
        await f.advance();
        if (reason !== "timeout") f.ready();
        const overlay = f.windows[1];
        if (reason === "abort") f.send("abort");
        if (reason === "close") overlay.destroy();
        if (reason === "blur") overlay.emit("blur");
        if (reason === "display-change") f.screen.emit("display-metrics-changed");
        if (reason === "crash") overlay.webContents.emit("render-process-gone");
        if (reason === "failed") f.send("failed");
        if (reason === "timeout") await f.advance(30000);
        if (reason === "navigation") f.owner.webContents.emit("did-start-navigation", {}, "file:///next", false, true);
        assert.notEqual((await promise).status, "ok");
        assert.equal(f.owner.visible, true);
        assert.equal(overlay.destroyed, true);
        assert.equal(f.timers.size, 0);
        const again = f.start();
        await f.advance();
        assert.equal((await again).status, "ok");
    });
}

for (const issue of ["denied", "empty", "downscaled", "wrong-screen"]) {
    test(`source ${issue} returns an error without inserting an inaccurate image`, async () => {
        const f = fixture();
        f.capture(async () => {
            if (issue === "denied") throw new Error("permission denied");
            if (issue === "empty") return [];
            if (issue === "downscaled") return [{ display_id: "7", thumbnail: f.image(960, 540) }];
            return [{ display_id: "11", thumbnail: f.image(1280, 720) }, { display_id: "12", thumbnail: f.image(1280, 720) }];
        });
        const promise = f.start();
        await f.advance();
        assert.equal((await promise).status, "error");
        assert.equal(f.owner.visible, true);
    });
}

test("duplicate request, unknown sender and subframe cannot take over capture", async () => {
    const f = fixture();
    const first = f.start("area");
    assert.equal((await f.start()).status, "cancelled");
    assert.equal((await f.start("other")).status, "error");
    assert.equal((await f.start("screen", { ...f.event(), senderFrame: {} })).status, "error");
    await f.advance();
    f.ready();
    f.send("selection", { left: 0, top: 0, right: 1, bottom: 1 }, f.owner);
    assert.equal(f.owner.visible, false);
    assert.equal((await f.start("screen", f.event(f.windows[1]))).status, "error");
    f.send("abort");
    assert.equal((await first).status, "cancelled");
});

test("late capture result after timeout cannot open overlay or finish a newer session", async () => {
    const f = fixture();
    let resolveCapture;
    f.capture(() => new Promise((resolve) => { resolveCapture = resolve; }));
    const first = f.start("area");
    await f.advance();
    await f.advance(30000);
    assert.equal((await first).status, "error");
    const newer = f.start();
    resolveCapture([{ display_id: "7", thumbnail: f.image(1920, 1080) }]);
    for (let i = 0; i < 8; i++) await Promise.resolve();
    assert.equal(f.windows.length, 1);
    f.send("cancel", undefined, f.owner);
    assert.equal((await newer).status, "cancelled");
    await f.advance();
});

test("closing the owner destroys the selection without reopening drAW", async () => {
    const f = fixture();
    const promise = f.start("area");
    await f.advance();
    f.ready();
    f.owner.destroy();
    assert.equal((await promise).status, "cancelled");
    assert.equal(f.windows[1].destroyed, true);
    assert(!f.actions.some((a) => a[0] === "show" && a[1] === f.owner));
});
