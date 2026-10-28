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
const { pixelSelection, pngSize } = geometry;

function pngHeader(width, height) {
    const buffer = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
    buffer.writeUInt32BE(13, 8);
    buffer.write("IHDR", 12, "latin1");
    buffer.writeUInt32BE(width, 16);
    buffer.writeUInt32BE(height, 20);
    return buffer;
}

test("PNG size is read from the IHDR header without decoding", () => {
    assert.deepEqual(pngSize(pngHeader(3840, 2160)), { width: 3840, height: 2160 });
    assert.deepEqual(pngSize(new Uint8Array(pngHeader(1, 1))), { width: 1, height: 1 });
    for (const bad of [Buffer.alloc(0), pngHeader(0, 1080), Buffer.from(JSON.stringify({ width: 1, height: 1 })),
        Buffer.concat([Buffer.from([0]), pngHeader(10, 10)])]) {
        assert.equal(pngSize(bad), null);
    }
    const wrongChunk = pngHeader(10, 10);
    wrongChunk.write("IDAT", 12, "latin1");
    assert.equal(pngSize(wrongChunk), null);
});

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

function fixture({ scale = 1, platform = "linux", displayId = 7, bounds = { x: 0, y: 0, width: 1920, height: 1080 }, loads = true } = {}) {
    const handlers = new Map();
    const logs = [];
    const windows = [];
    const actions = [];
    const timers = new Map();
    let clock = 0;
    let sequence = 0;
    let requested;
    let capture = async () => [{ display_id: String(displayId), thumbnail: image(bounds.width * scale, bounds.height * scale) }];
    let display = { id: displayId, bounds, workArea: { ...bounds, height: bounds.height - 64 }, scaleFactor: scale };
    const displays = [display];
    const screen = Object.assign(new EventEmitter(), { getDisplayMatching: () => display,
        setDisplay: (value) => { display = value; }, getAllDisplays: () => displays });
    function image(width, height) {
        return {
            isEmpty: () => width === 0,
            getSize: () => ({ width, height }),
            toPNG: () => { actions.push(["encode", width, height]); return pngHeader(width, height); },
            toDataURL: () => `data:image/png;base64,${Buffer.from(`${width}x${height}`).toString("base64")}`,
            crop(rect) { actions.push(["crop", rect]); return image(rect.width, rect.height); }
        };
    }
    class Window extends EventEmitter {
        constructor(options = {}) {
            super();
            this.options = options;
            this.destroyed = false;
            // Gerçek Electron gibi: Linux'ta fullscreen ile oluşturulan pencere show:false olsa da görünür.
            this.visible = options.show !== false || (options.fullscreen === true && platform === "linux");
            this.fullscreen = options.fullscreen === true;
            this.contents = Object.assign(new EventEmitter(), {
                id: windows.length + 1, mainFrame: {},
                send: (name, value) => actions.push(["send", name, value]),
                setWindowOpenHandler: () => {}
            });
            windows.push(this);
        }
        // Gerçek Electron gibi: yok edilen pencerenin webContents'i okunamaz.
        get webContents() {
            if (this.destroyed) throw new TypeError("Object has been destroyed");
            return this.contents;
        }
        static fromWebContents(sender) { return windows.find((w) => w.contents === sender) ?? null; }
        setFullScreen(value) { this.fullscreen = value; actions.push(["fullscreen", this, value]); }
        getBounds() { return bounds; }
        isVisible() { return this.visible; }
        isDestroyed() { return this.destroyed; }
        hide() { this.visible = false; actions.push(["hide", this]); }
        show() { assert(!this.destroyed); this.visible = true; actions.push(["show", this]); }
        focus() { actions.push(["focus", this]); }
        setMenu() {}
        setAlwaysOnTop() {}
        loadFile(file) { this.file = file; return loads ? Promise.resolve() : Promise.reject(new Error("load")); }
        destroy() { this.destroyed = true; this.emit("closed"); }
    }
    const electron = {
        BrowserWindow: Window, screen,
        nativeImage: { createFromBuffer(buffer) { actions.push(["decode"]); const { width, height } = pngSize(buffer); return image(width, height); } },
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
    const service = new QuickCaptureService("/new-capture", (line) => logs.push(line));
    service.register({ handle: (key, handler) => handlers.set(key, handler), on: (key, handler) => handlers.set(key, handler) });
    const owner = new Window();
    service.allowWindow(owner);
    const event = (window = owner) => ({ sender: window.contents, senderFrame: window.contents.mainFrame });
    const send = (name, value, window = windows[1]) => handlers.get(`quick-capture:${name}`)(event(window), value);
    return {
        owner, windows, screen, displays, actions, timers, service, image, event, handlers, logs,
        requested: () => requested,
        capture: (fn) => { capture = fn; },
        start: (mode = "screen", e = event()) => handlers.get("quick-capture:take")(e, mode), send,
        async advance(ms = 200) {
            clock += ms;
            for (const [id, timer] of [...timers]) {
                if (timer.at <= clock) { timers.delete(id); timer.callback(); }
            }
            for (let i = 0; i < 20; i++) await Promise.resolve();
        },
        prepare(window = owner) { handlers.get("quick-capture:prepare")(event(window)); },
        ready(window) { send("shown", undefined, window); }
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
        assert(f.windows.slice(1).every((w) => w.destroyed && !w.visible), "invalid source must not open selection");
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

test("Linux: with one source per display, the source left after the other displays' IDs is drAW's", async () => {
    const f = fixture({ displayId: 7 });
    f.displays.push({ ...f.displays[0], id: 1881264395124801, bounds: { x: 1920, y: 0, width: 1920, height: 1080 } });
    const target = f.image(1920, 1080);
    f.capture(async () => [{ display_id: "65", thumbnail: f.image(1920, 1080) }, { display_id: "3", thumbnail: target }]);
    const promise = f.start();
    await f.advance();
    assert.equal((await promise).status, "ok");
    assert(f.actions.some((a) => a[0] === "encode"), "the remaining source is encoded");
    const ambiguous = fixture({ displayId: 7 });
    ambiguous.displays.push({ ...ambiguous.displays[0], id: 8 });
    ambiguous.capture(async () => [{ display_id: "3", thumbnail: ambiguous.image(1920, 1080) }, { display_id: "4", thumbnail: ambiguous.image(1920, 1080) }]);
    const failed = ambiguous.start();
    await ambiguous.advance();
    assert.equal((await failed).status, "error");
});

for (const mode of ["screen", "area"]) {
    test(`Linux ${mode}: a single whole-desktop source is captured at full size and drAW's display is cut out`, async () => {
        const bounds = { x: 1536, y: 0, width: 1536, height: 864 };
        const f = fixture({ displayId: 7, scale: 1.25, bounds });
        f.displays.push({ ...f.displays[0], id: 8, bounds: { x: 0, y: 0, width: 1536, height: 864 } });
        f.capture(async () => {
            const { width, height } = f.requested().thumbnailSize;
            // The capturer letterboxes the whole 3840x1080 desktop into the requested box.
            const scale = Math.min(width / 3840, height / 1080);
            return [{ display_id: "", thumbnail: f.image(Math.round(3840 * scale), Math.round(1080 * scale)) }];
        });
        const promise = f.start(mode);
        await f.advance();
        if (mode === "area") {
            f.ready();
            f.send("selection", { left: 0, top: 0, right: 1, bottom: 1 });
        }
        const reply = await promise;
        assert.equal(reply.status, "ok", reply.message);
        assert.deepEqual(f.requested().thumbnailSize, { width: 3840, height: 1080 });
        assert.deepEqual(f.actions.find((a) => a[0] === "crop")[1], { x: 1920, y: 0, width: 1920, height: 1080 });
        assert.equal(reply.image.width, 1920);
        assert.equal(reply.image.height, 1080);
        assert.match(f.logs.at(-1), /masaüstü=/);
    });
}

test("an unmatched source is reported with the displays and sources in the capture log", async () => {
    const f = fixture({ displayId: 7 });
    f.displays.push({ ...f.displays[0], id: 8, bounds: { x: 1920, y: 0, width: 1920, height: 1080 } });
    // A single source that is neither display nor the whole desktop.
    f.capture(async () => [{ display_id: "", thumbnail: f.image(1280, 1024) }]);
    const promise = f.start();
    await f.advance();
    const reply = await promise;
    assert.equal(reply.status, "error");
    assert.match(reply.message, /eşleştirilemedi/);
    assert.match(f.logs.at(-1), / ekran=7 ekranlar=7@0,0,1920x1080x1;8@1920,0,1920x1080x1 kaynaklar=-:1280x1024$/);
});

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
    for (let i = 0; i < 20; i++) await Promise.resolve();
    assert(f.windows.slice(1).every((w) => w.destroyed && !w.visible));
    assert(!f.actions.some((a) => a[0] === "send"), "late result must not reach a selection window");
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

test("full screen encodes the source once and never decodes it", async () => {
    const f = fixture({ scale: 2 });
    const promise = f.start();
    await f.advance();
    const reply = await promise;
    assert.equal(reply.status, "ok");
    assert.deepEqual(f.actions.filter((a) => a[0] === "encode" || a[0] === "decode"), [["encode", 3840, 2160]]);
    assert.equal(reply.image.dataUrl, `data:image/png;base64,${pngHeader(3840, 2160).toString("base64")}`);
});

test("area sends the source PNG bytes to the selection window and decodes only for the crop", async () => {
    const f = fixture();
    const promise = f.start("area");
    await f.advance();
    const sent = f.actions.filter((a) => a[0] === "send");
    assert.equal(sent.length, 1);
    assert.equal(sent[0][1], "quick-capture:image");
    assert(Buffer.isBuffer(sent[0][2]) && sent[0][2].equals(pngHeader(1920, 1080)), "selection must receive PNG bytes, not a data URL");
    assert(!f.actions.some((a) => a[0] === "decode"), "nothing to decode before a selection exists");
    f.ready();
    f.send("selection", { left: 0, top: 0, right: .5, bottom: .5 });
    assert.equal((await promise).status, "ok");
    assert.deepEqual(f.actions.filter((a) => a[0] === "encode" || a[0] === "decode"), [["encode", 1920, 1080], ["decode"]]);
});

test("selection window is created while the screen is captured, hidden until its image is shown", async () => {
    const f = fixture();
    let resolveCapture;
    f.capture(() => new Promise((resolve) => { resolveCapture = resolve; }));
    const promise = f.start("area");
    for (let i = 0; i < 4; i++) await Promise.resolve();
    assert.equal(f.windows.length, 2, "selection window must load during the capture");
    assert.equal(f.windows[1].visible, false);
    await f.advance();
    resolveCapture([{ display_id: "7", thumbnail: f.image(1920, 1080) }]);
    await f.advance(0);
    assert.equal(f.windows[1].visible, false, "window must wait for its painted image");
    f.ready();
    assert.equal(f.windows[1].visible, true);
    f.send("abort");
    assert.equal((await promise).status, "cancelled");
});

test("palette prepares one hidden selection window that the next area capture reuses", async () => {
    const f = fixture();
    f.prepare();
    f.prepare();
    assert.equal(f.windows.length, 2, "repeated palette openings must reuse the prepared window");
    const prepared = f.windows[1];
    assert.equal(prepared.visible, false);
    assert.equal(f.timers.size, 1, "prepared window needs exactly one expiry timer");
    const screenshot = f.start();
    await f.advance();
    assert.equal((await screenshot).status, "ok");
    assert.equal(prepared.destroyed, false, "full screen must leave the prepared window for a later area capture");
    const promise = f.start("area");
    await f.advance();
    assert.equal(f.windows.length, 2, "area capture must not create another window");
    assert(f.actions.some((a) => a[0] === "send"));
    f.ready();
    assert.equal(prepared.visible, true);
    f.send("selection", { left: .1, top: .1, right: .4, bottom: .4 });
    assert.equal((await promise).status, "ok");
    assert.equal(prepared.destroyed, true);
    assert.equal(f.timers.size, 0);
    assert.match(f.logs.at(-1), /linux area 1920x1080 hazır-pencere=\d+ms kaynak=\d+ms png=\d+ms yüklendi=\d+ms görünme=\d+ms bitti=\d+ms$/);
    const next = f.start("area");
    await f.advance();
    assert.equal(f.windows.length, 3, "a used window is not reused");
    assert.match(f.logs.at(-1), /screen|area/);
    f.send("abort", undefined, f.windows[2]);
    assert.equal((await next).status, "cancelled");
    assert.match(f.logs.at(-1), /yeni-pencere=\d+ms .*iptal=\d+ms$/);
});

for (const reason of ["expiry", "display-change", "owner-closed", "crash", "other-display", "load-failure"]) {
    test(`prepared selection window is discarded on ${reason}`, async () => {
        const f = fixture({ loads: reason !== "load-failure" });
        f.prepare();
        const prepared = f.windows[1];
        if (reason === "expiry") await f.advance(60000);
        if (reason === "display-change") f.screen.emit("display-metrics-changed");
        if (reason === "crash") prepared.webContents.emit("render-process-gone");
        if (reason === "owner-closed") {
            f.owner.destroy();
            assert.equal(prepared.destroyed, true, "a hidden window must not keep the app alive");
            return;
        }
        if (reason === "other-display") {
            f.screen.setDisplay({ id: 8, bounds: { x: 1920, y: 0, width: 1920, height: 1080 }, scaleFactor: 1 });
            f.capture(async () => [{ display_id: "8", thumbnail: f.image(1920, 1080) }]);
        }
        if (reason !== "other-display" && reason !== "load-failure") {
            assert.equal(prepared.destroyed, true);
            assert.equal(f.timers.size, 0);
            assert.equal(f.screen.listenerCount("display-metrics-changed"), 0);
        }
        const promise = f.start("area");
        await f.advance();
        if (reason === "load-failure") {
            const reply = await promise;
            assert.equal(reply.status, "error");
            assert.match(reply.message, /hazırlanamadı/);
            assert.equal(f.owner.visible, true);
            assert.equal(prepared.destroyed, true);
            return;
        }
        assert.equal(prepared.destroyed, true);
        const overlay = f.windows.at(-1);
        assert.notEqual(overlay, prepared);
        if (reason === "other-display") assert.equal(overlay.options.x, 1920);
        f.ready(overlay);
        assert.equal(overlay.visible, true);
        f.send("abort", undefined, overlay);
        assert.equal((await promise).status, "cancelled");
    });
}

test("prepare ignores unknown senders, subframes, active captures and unsupported platforms", async () => {
    const stranger = fixture();
    const outsider = new stranger.owner.constructor();
    stranger.prepare(outsider);
    stranger.handlers.get("quick-capture:prepare")({ ...stranger.event(), senderFrame: {} });
    assert.equal(stranger.windows.length, 2, "only the outsider window itself exists");
    const busy = fixture();
    const promise = busy.start();
    busy.prepare();
    assert.equal(busy.windows.length, 1);
    await busy.advance();
    await promise;
    const mac = fixture({ platform: "darwin" });
    mac.prepare();
    assert.equal(mac.windows.length, 1);
});

for (const platform of ["linux", "win32"]) {
    test(`${platform}: the prepared selection window stays hidden until its image is shown, then goes full screen`, async () => {
        const f = fixture({ platform });
        f.prepare();
        const prepared = f.windows[1];
        assert.equal(prepared.options.fullscreen, false, "a full-screen window would be visible on Linux even with show:false");
        assert.equal(prepared.visible, false, "opening the palette must not show the selection window");
        const promise = f.start("area");
        await f.advance();
        assert.equal(prepared.visible, false, "selection window appeared before its image was ready");
        f.ready(prepared);
        const order = f.actions.filter((a) => a[1] === prepared && (a[0] === "fullscreen" || a[0] === "show")).map((a) => a[0]);
        assert.deepEqual(order, ["fullscreen", "show"], "selection must enter full screen before it is shown");
        f.send("abort", undefined, prepared);
        assert.equal((await promise).status, "cancelled");
    });
}

test("closing the prepared selection window from outside does not crash the main process", async () => {
    // Pardus'ta görülen hata: kapanan pencerenin webContents'ine erişim ("Object has been destroyed").
    const f = fixture();
    f.prepare();
    const prepared = f.windows[1];
    assert.doesNotThrow(() => prepared.destroy());
    assert.equal(f.timers.size, 0);
    assert.equal(f.screen.listenerCount("display-metrics-changed"), 0);
    const promise = f.start("area");
    await f.advance();
    const overlay = f.windows.at(-1);
    assert.notEqual(overlay, prepared, "a destroyed window must not be reused");
    f.ready(overlay);
    f.send("selection", { left: 0, top: 0, right: .5, bottom: .5 }, overlay);
    assert.equal((await promise).status, "ok");
});

test("closing drAW during a capture does not touch its destroyed webContents", async () => {
    const f = fixture();
    const promise = f.start("area");
    await f.advance();
    f.ready();
    assert.doesNotThrow(() => f.owner.destroy());
    assert.equal((await promise).status, "cancelled");
});
