// Real Chromium input: synthetic DOM events do not exercise touch-action or pointer capture.
// Run: node tests/overlay-touch.cjs (CHROMIUM may specify another Chromium executable).
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { readFileSync, mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const overlayDir = path.resolve(process.argv[2] ?? path.join(__dirname, "../electron"));
const preload = readFileSync(path.join(overlayDir, "overlay-preload.cjs"), "utf8");
const profile = mkdtempSync(path.join(tmpdir(), "draw-overlay-test-"));
const browser = spawn(process.env.CHROMIUM ?? "chromium", [
    "--headless", "--no-sandbox", "--disable-gpu", "--remote-debugging-pipe", `--user-data-dir=${profile}`
], { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"] });
let nextId = 0, buffered = "", sessionId, browserErrors = "", passed = 0;
const pending = new Map();
browser.stderr.on("data", data => browserErrors += data);
browser.stdio[4].on("data", data => {
    buffered += data.toString();
    let end;
    while ((end = buffered.indexOf("\0")) !== -1) {
        const message = JSON.parse(buffered.slice(0, end));
        buffered = buffered.slice(end + 1);
        const request = pending.get(message.id);
        if (!request) continue;
        pending.delete(message.id);
        clearTimeout(request.timer);
        if (message.error) request.reject(new Error(JSON.stringify(message.error)));
        else request.resolve(message.result);
    }
});
function send(method, params = {}, session = sessionId) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`CDP timed out: ${method}\n${browserErrors.slice(-1000)}`)), 10000);
        pending.set(id, { resolve, reject, timer });
        browser.stdio[3].write(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }) + "\0");
    });
}
async function evaluate(expression) {
    const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    return response.result.value;
}
const rect = () => evaluate(`(() => {
    const s = document.querySelector('#selection');
    return { x: parseFloat(s.style.left), y: parseFloat(s.style.top), width: parseFloat(s.style.width), height: parseFloat(s.style.height) };
})()`);
function closeRect(actual, expected, message) {
    for (const key of ["x", "y", "width", "height"]) {
        assert(Math.abs(actual[key] - expected[key]) < 1, `${message}: ${key}: ${actual[key]} != ${expected[key]}`);
    }
}
async function touch(type, points) {
    await send("Input.dispatchTouchEvent", {
        type, touchPoints: points.map(([id, x, y]) => ({ id, x, y, radiusX: 10, radiusY: 10, force: 1 }))
    });
}
async function drag(pointerType, start, end) {
    if (pointerType === "touch") {
        await touch("touchStart", [[1, ...start]]);
        await touch("touchMove", [[1, (start[0] + end[0]) / 2, (start[1] + end[1]) / 2]]);
        await touch("touchMove", [[1, ...end]]);
        await touch("touchEnd", []);
    } else {
        await send("Input.dispatchMouseEvent", { type: "mousePressed", x: start[0], y: start[1], button: "left", buttons: 1, clickCount: 1, pointerType });
        await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: end[0], y: end[1], button: "left", buttons: 1, pointerType });
        await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: end[0], y: end[1], button: "left", buttons: 0, clickCount: 1, pointerType });
    }
}
let sourceNumber = 0;
async function source(width, height) {
    return evaluate(`new Promise((resolve, reject) => {
        const image = document.querySelector('#capture');
        image.addEventListener('load', () => {
            const b = image.getBoundingClientRect();
            const scale = Math.min(b.width / image.naturalWidth, b.height / image.naturalHeight);
            const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
            resolve({ x: b.left + (b.width - width) / 2, y: b.top + (b.height - height) / 2, width, height });
        }, { once: true });
        image.addEventListener('error', reject, { once: true });
        window.captureMock.source({}, { dataUrl: 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#e2e8f0"/><!--${++sourceNumber}--></svg>') });
    })`);
}
async function init(config) {
    await send("Emulation.setDeviceMetricsOverride", { width: config[0], height: config[1], deviceScaleFactor: config[2], mobile: false });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 16 });
    await send("Page.navigate", { url: pathToFileURL(path.join(overlayDir, "overlay.html")).href });
    for (let i = 0; i < 100; i++) {
        if (await evaluate("document.readyState === 'complete'")) break;
        await new Promise(resolve => setTimeout(resolve, 20));
    }
    await evaluate(`(() => {
        window.captureMock = { messages: [], on(name, callback) { this.source = callback; }, send(name, payload) { this.messages.push({ name, payload }); } };
        document.addEventListener('pointerdown', event => window.captureMock.pointerId = event.pointerId, true);
        new Function('require', 'exports', ${JSON.stringify(preload)})(() => ({ ipcRenderer: window.captureMock }), {});
        window.dispatchEvent(new Event('DOMContentLoaded'));
    })()`);
    return source(config[3], config[4]);
}

(async () => {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" }, null);
    ({ sessionId } = await send("Target.attachToTarget", { targetId, flatten: true }, null));
    await send("Page.enable");
    const configs = [[1280, 900, 1, 2560, 1800], [1920, 1080, 2, 3840, 2160], [1280, 900, 1, 1920, 1080]];
    for (const config of configs) {
        const content = await init(config);
        assert(content.x >= 0 && content.y >= 0 && content.width <= config[0] && content.height <= config[1], "source image overflows the screen");
        for (const pointerType of ["touch", "pen", "mouse"]) {
            await source(config[3], config[4]);
            const start = [content.x + 60, content.y + 60], end = [content.x + 280, content.y + 220];
            await drag(pointerType, start, end);
            const drawn = { x: start[0], y: start[1], width: 220, height: 160 };
            closeRect(await rect(), drawn, `${pointerType} draws with ${config}`);
            await drag(pointerType, [drawn.x + 70, drawn.y + 70], [drawn.x + 190, drawn.y + 150]);
            const moved = { ...drawn, x: drawn.x + 120, y: drawn.y + 80 };
            closeRect(await rect(), moved, `${pointerType} moves with ${config}`);
            // Start in the invisible padding of the southeast handle, beyond its small visible square.
            await drag(pointerType, [moved.x + moved.width + 14, moved.y + moved.height + 14],
                [moved.x + moved.width + 74, moved.y + moved.height + 54]);
            const resized = { ...moved, width: moved.width + 60, height: moved.height + 40 };
            closeRect(await rect(), resized, `${pointerType} resizes without jumping with ${config}`);
            await evaluate("document.querySelector('#captureButton').click()");
            const payload = await evaluate("window.captureMock.messages.at(-1).payload");
            closeRect(payload, { ...resized, x: resized.x - content.x, y: resized.y - content.y }, "capture coordinates");
            assert.equal(payload.renderedWidth, content.width);
            assert.equal(payload.renderedHeight, content.height);
            passed += 4;
        }
        console.log(`PASS: touch/pen/mouse drawing, moving, resizing and crop mapping (${config.join(', ')})`);
    }

    const config = configs[0];
    await init(config);
    for (const dir of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) {
        await source(config[3], config[4]);
        const before = await rect();
        const handle = await evaluate(`(() => { const b = document.querySelector('[data-dir="${dir}"]').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
        const dx = dir.includes("w") ? -60 : dir.includes("e") ? 60 : 0;
        const dy = dir.includes("n") ? -40 : dir.includes("s") ? 40 : 0;
        await drag("touch", handle, [handle[0] + dx, handle[1] + dy]);
        closeRect(await rect(), { x: before.x + Math.min(0, dx), y: before.y + Math.min(0, dy), width: before.width + Math.abs(dx), height: before.height + Math.abs(dy) }, `${dir} handle`);
        passed++;
    }

    await source(config[3], config[4]);
    await touch("touchStart", [[1, 60, 60]]);
    await touch("touchMove", [[1, 250, 220]]);
    await touch("touchStart", [[1, 250, 220], [2, 900, 100]]);
    await touch("touchMove", [[1, 250, 220], [2, 1100, 350]]);
    await evaluate(`document.querySelector('#interaction').dispatchEvent(new PointerEvent('pointerup', {
        pointerId: window.captureMock.pointerId, pointerType: 'touch', clientX: 1100, clientY: 350
    }))`);
    closeRect(await rect(), { x: 60, y: 60, width: 190, height: 160 }, "second touch must not take over");
    assert(await evaluate("document.querySelector('#captureButton').disabled"), "capture remained enabled during a gesture");
    await touch("touchMove", [[1, 300, 260], [2, 1100, 350]]);
    await touch("touchEnd", []);
    closeRect(await rect(), { x: 60, y: 60, width: 240, height: 200 }, "first touch remains in control");
    passed++;

    for (const cancellation of ["touchCancel", "lostpointercapture", "blur"]) {
        await source(config[3], config[4]);
        const before = await rect();
        await touch("touchStart", [[1, before.x + 70, before.y + 70]]);
        await touch("touchMove", [[1, before.x + 150, before.y + 150]]);
        if (cancellation === "touchCancel") await touch("touchCancel", []);
        else {
            await evaluate(cancellation === "blur" ? "window.dispatchEvent(new Event('blur'))" :
                "document.querySelector('#interaction').releasePointerCapture(window.captureMock.pointerId)");
            await touch("touchEnd", []);
        }
        closeRect(await rect(), before, `${cancellation} restores previous selection`);
        await drag("touch", [60, 400], [260, 560]);
        closeRect(await rect(), { x: 60, y: 400, width: 200, height: 160 }, `${cancellation} allows a fresh gesture`);
        passed++;
    }

    // Tiny rectangles must remain movable even when the expanded handle hit areas overlap.
    await drag("touch", [60, 60], [90, 90]);
    await drag("touch", [75, 75], [175, 175]);
    closeRect(await rect(), { x: 160, y: 160, width: 30, height: 30 }, "small selection can move");
    const saved = await rect();
    await evaluate("document.querySelector('#screenButton').click()");
    closeRect(await rect(), { x: 1, y: 1, width: 1278, height: 898 }, "full screen mode");
    await drag("touch", [60, 60], [280, 220]);
    closeRect(await rect(), { x: 1, y: 1, width: 1278, height: 898 }, "full screen mode is locked");
    await evaluate("document.querySelector('#selectionButton').click()");
    closeRect(await rect(), saved, "selection mode restores the last rectangle");
    passed += 2;

    // A release may carry a final position that never arrived as pointermove.
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: 60, y: 400, button: "left", buttons: 1, clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 280, y: 560, button: "left", buttons: 0, clickCount: 1 });
    closeRect(await rect(), { x: 60, y: 400, width: 220, height: 160 }, "release applies the final position");
    const finalSelection = await rect();
    passed++;

    const bar = await evaluate(`(() => { const b = document.querySelector('.toolbox__titlebar').getBoundingClientRect(); return { x: b.x, y: b.y }; })()`);
    await drag("touch", [bar.x + 30, bar.y + 20], [bar.x - 170, bar.y - 80]);
    const movedBar = await evaluate(`(() => { const b = document.querySelector('.toolbox__titlebar').getBoundingClientRect(); return { x: b.x, y: b.y }; })()`);
    assert.equal(movedBar.x, bar.x - 200);
    assert.equal(movedBar.y, bar.y - 100);
    closeRect(await rect(), finalSelection, "moving toolbox leaves selection alone");
    await evaluate("document.querySelector('#cancelButton').click()");
    assert.equal(await evaluate("window.captureMock.messages.at(-1).name"), "screen-capture:cancel");
    passed++;
    console.log(`PASS: ${passed} overlay checks with real browser input`);
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
}).finally(async () => {
    const exited = new Promise(resolve => browser.once("exit", resolve));
    await send("Browser.close", {}, null).catch(() => {});
    browser.kill();
    await exited;
    for (const { timer } of pending.values()) clearTimeout(timer);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});
