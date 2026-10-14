const assert = require("node:assert/strict");
const { readFile, writeFile } = require("node:fs/promises");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { browser } = require("./helpers/chromium.cjs");

async function main() {
    const b = await browser();
    let passed = 0;
    const directory = path.resolve(__dirname, "../electron/quick-capture");
    const preload = await readFile(path.join(directory, "selection.cjs"), "utf8");
    const sourceURL = pathToFileURL(path.join(directory, "selection.html")).href;
    const base = process.env.DRAW_TEST_URL || "http://127.0.0.1:5173";
    const cases = [
        [1280, 900, 1, 2560, 1800], [1920, 1080, 2, 3840, 2160],
        [1280, 900, 1, 1920, 1080], [1280, 900, 1.25, 1600, 1125]
    ];
    async function initialize([width, height, deviceScaleFactor, sourceWidth, sourceHeight] = cases[0]) {
        await b.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor, mobile: false });
        await b.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 16 });
        // Her seçim yeni pencere gibi ayrı bir belge ve bağımsız IPC oturumu kullanır.
        await b.goto("about:blank");
        await b.goto(sourceURL);
        await b.evaluate(`(() => {
            window.sent = []; window.receivers = {}; window.inputTrace = [];
            for (const name of ["pointerdown", "pointermove", "pointerup", "pointercancel", "gotpointercapture", "lostpointercapture", "blur", "resize"]) {
                window.addEventListener(name, event => window.inputTrace.push({ name, id: event.pointerId, x: event.clientX, y: event.clientY, button: event.button, buttons: event.buttons, target: event.target?.id }), true);
            }
            const ipcRenderer = {
                once(name, listener) { window.receivers[name] = listener; },
                send(name, value) { window.sent.push({ name, value }); }
            };
            (function(require, exports) { ${preload}\n })(() => ({ ipcRenderer }), {});
            window.dispatchEvent(new Event("DOMContentLoaded"));
            document.getElementById("surface").addEventListener("pointerdown", event => window.lastPointer = event.pointerId);
            const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="${sourceWidth}" height="${sourceHeight}"><rect width="100%" height="100%" fill="#edf2f7"/><rect width="80" height="80" fill="#2563eb"/></svg>';
            window.receivers["quick-capture:image"]({}, "data:image/svg+xml;base64," + btoa(svg));
        })()`);
        await b.until('window.sent.some(event => event.name === "quick-capture:shown")');
        await b.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    }
    const touch = (type, points) => b.send("Input.dispatchTouchEvent", {
        type, touchPoints: points.map(([id, x, y]) => ({ id, x, y, radiusX: 6, radiusY: 6, force: 1 }))
    });
    async function gesture(kind, from, to, move = true) {
        if (kind === "touch") {
            await touch("touchStart", [[1, ...from]]);
            if (move) await touch("touchMove", [[1, ...to]]);
            await touch("touchEnd", []);
        } else {
            await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: from[0], y: from[1], button: "left", buttons: 1, clickCount: 1, pointerType: kind });
            if (move) await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: to[0], y: to[1], button: "left", buttons: 1, pointerType: kind });
            await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: to[0], y: to[1], button: "left", buttons: 0, clickCount: 1, pointerType: kind });
        }
    }
    const selections = () => b.evaluate('window.sent.filter(event => event.name === "quick-capture:selection")');
    function closeTo(actual, expected) { assert(Math.abs(actual - expected) < .00001, `${actual} !== ${expected}`); }
    try {
        for (const configuration of cases) {
            const [width, height, , sourceWidth, sourceHeight] = configuration;
            const scale = Math.min(width / sourceWidth, height / sourceHeight);
            const left = (width - sourceWidth * scale) / 2;
            const top = (height - sourceHeight * scale) / 2;
            for (const kind of ["touch", "mouse", "pen"]) {
                for (const reverse of [false, true]) {
                    await initialize(configuration);
                    let from = [left + sourceWidth * scale * .2, top + sourceHeight * scale * .2];
                    let to = [left + sourceWidth * scale * .7, top + sourceHeight * scale * .7];
                    if (reverse) [from, to] = [to, from];
                    await gesture(kind, from, to);
                    const results = await selections();
                    assert.equal(results.length, 1, `${kind}/${reverse}/${configuration} must complete on release: ${results.length ? "" : JSON.stringify(await b.evaluate("({events: window.inputTrace, sent: window.sent, size: [innerWidth, innerHeight]})"))}`);
                    const rect = results[0].value;
                    closeTo(rect.left, .2); closeTo(rect.top, .2); closeTo(rect.right, .7); closeTo(rect.bottom, .7);
                    passed++;
                }
            }
            console.log(`PASS: native touch/mouse/pen area selection ${configuration.join("/")}`);
        }
        await initialize();
        await gesture("mouse", [120, 180], [520, 480], false);
        assert.equal((await selections()).length, 1, "release without pointermove must use final position"); passed++;

        await initialize();
        await touch("touchStart", [[1, 100, 200]]);
        await touch("touchMove", [[1, 500, 500]]);
        await touch("touchStart", [[1, 500, 500], [2, 800, 200]]);
        await touch("touchMove", [[1, 500, 500], [2, 1000, 700]]);
        // CDP burada bırakılan parmağın kimliğini bekler.
        await touch("touchEnd", [[2, 1000, 700]]);
        assert.equal((await selections()).length, 0, `second finger release completed capture: ${JSON.stringify(await b.evaluate("window.inputTrace"))}`);
        await touch("touchEnd", []);
        const selected = (await selections())[0].value;
        closeTo(selected.left, 100 / 1280); closeTo(selected.right, 500 / 1280);
        closeTo(selected.top, 200 / 900); closeTo(selected.bottom, 500 / 900); passed++;

        for (const interrupted of ["touchCancel", "lostcapture", "blur", "resize"]) {
            await initialize();
            await touch("touchStart", [[1, 100, 200]]);
            await touch("touchMove", [[1, 300, 300]]);
            if (interrupted === "touchCancel") await touch("touchCancel", []);
            else {
                if (interrupted === "lostcapture") await b.evaluate('document.getElementById("surface").releasePointerCapture(window.lastPointer)');
                else await b.evaluate(`window.dispatchEvent(new Event(${JSON.stringify(interrupted)}))`);
                await touch("touchEnd", []);
            }
            assert.equal((await selections()).length, 0, `${interrupted} must not capture partial rectangle`);
            await gesture("touch", [400, 400], [600, 600]);
            assert.equal((await selections()).length, 1, `${interrupted} blocked next gesture`); passed++;
        }
        await initialize();
        await gesture("touch", [100, 200], [100, 200]);
        assert.equal((await selections()).length, 0, "single tap must not insert a tiny image");
        await gesture("touch", [100, 200], [300, 400]);
        assert.equal((await selections()).length, 1); passed++;

        for (const cancel of ["button", "escape"]) {
            await initialize();
            if (cancel === "button") await gesture("touch", [1240, 40], [1240, 40]);
            else await b.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
            assert.equal(await b.evaluate('window.sent.filter(event => event.name === "quick-capture:abort").length'), 1);
            assert.equal((await selections()).length, 0); passed++;
        }

        for (const configuration of [
            { mode: "pc", platform: "win32", width: 1280, height: 900, dpr: 1 },
            { mode: "board", platform: "linux", width: 1920, height: 1080, dpr: 2, tahta: 1 },
            { mode: "web", width: 1280, height: 900, dpr: 1 },
            { mode: "web", width: 1920, height: 1080, dpr: 1, tahta: 1 },
            { mode: "mobile", platform: "linux", width: 390, height: 844, dpr: 2 }
        ]) {
            const { mode, width, height, dpr, platform = "linux", tahta = 0 } = configuration;
            await b.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dpr, mobile: mode === "mobile" });
            await b.send("Emulation.setUserAgentOverride", { userAgent: mode === "mobile"
                ? "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36"
                : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36" });
            await b.goto(`${base}/tests/quick-capture-ui.html?mode=${mode}&platform=${platform}&tahta=${tahta}`);
            await b.until("window.__quickCaptureResult?.done === true");
            const result = await b.evaluate("window.__quickCaptureResult");
            assert.deepEqual(result.errors, [], `${mode}: ${JSON.stringify(result.errors)}`);
            passed += result.checks.length;
            console.log(`PASS: ${mode}/${platform}/tahta=${tahta}: ${result.checks.length} UI checks`);
            if (mode === "pc" || mode === "board") {
                const png = await b.send("Page.captureScreenshot", { format: "png" });
                await writeFile(`/tmp/draw-quick-capture-${mode}.png`, Buffer.from(png.data, "base64"));
            }
        }
        console.log(`PASS: ${passed} quick capture browser checks`);
    } finally { await b.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
