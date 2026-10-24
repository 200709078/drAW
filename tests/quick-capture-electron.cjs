// Run with: npx electron tests/quick-capture-electron.cjs
// Uses the real desktop, built UI and capture backend, with temporary in-memory drawings.
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "draw-real-capture-"));
app.setPath("userData", profile);
app.on("window-all-closed", () => {});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, name) {
    for (let i = 0; i < 200; i++) {
        if (await check()) return;
        await delay(50);
    }
    throw new Error(`Timed out: ${name}`);
}
function finish(code) {
    for (const window of BrowserWindow.getAllWindows()) window.destroy();
    fs.rmSync(profile, { recursive: true, force: true });
    app.exit(code);
}
const timer = setTimeout(() => { console.error("FAIL: real capture timed out"); finish(1); }, 40000);

app.whenReady().then(async () => {
    let code = 0;
    const trace = [];
    screen.on("display-metrics-changed", (_event, display, metrics) => trace.push({ event: "display-metrics-changed", id: display.id, metrics }));
    app.on("browser-window-created", (_event, window) => {
        for (const event of ["show", "hide", "focus", "blur", "closed"]) {
            window.on(event, () => trace.push({ window: window.id, event }));
        }
    });
    try {
        const { QuickCaptureService } = await import(pathToFileURL(path.join(root, "electron/quick-capture/service.ts")));
        const service = new QuickCaptureService(path.join(root, "electron/quick-capture"));
        let calls = 0;
        const results = [];
        service.register({
            handle(name, handler) {
                ipcMain.handle(name, async (...args) => {
                    calls++;
                    const reply = await handler(...args);
                    results.push(reply.status === "ok"
                        ? { status: reply.status, width: reply.image.width, height: reply.image.height } : reply);
                    return reply;
                });
            },
            on(name, handler) { ipcMain.on(name, (...args) => { trace.push({ ipc: name }); handler(...args); }); }
        });
        const saved = new Map();
        ipcMain.handle("storage:list", () => ({ ok: true, value: [...saved.values()] }));
        ipcMain.handle("storage:save", (_e, doc) => { saved.set(doc.id, doc); return { ok: true }; });
        ipcMain.handle("storage:load", (_e, id) => ({ ok: true, value: saved.get(id) ?? null }));
        ipcMain.handle("storage:delete", (_e, id) => { saved.delete(id); return { ok: true }; });
        ipcMain.handle("window:is-fullscreen", () => true);
        const owner = new BrowserWindow({
            show: false, frame: false, fullscreen: true,
            webPreferences: { preload: path.join(root, "electron/preload.cjs"), contextIsolation: true, nodeIntegration: false }
        });
        service.allowWindow(owner);
        const evaluate = async (expression) => {
            try { return await owner.webContents.executeJavaScript(expression); }
            catch (error) { throw new Error(`Renderer check failed: ${expression}`, { cause: error }); }
        };
        await owner.loadFile(path.join(root, "dist/index.html"));
        owner.show(); owner.focus();
        await delay(700);
        async function click(selector) {
            const { x, y } = await evaluate(`(() => {
                const b = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
                return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
            })()`);
            owner.webContents.sendInputEvent({ type: "mouseDown", x, y, button: "left", clickCount: 1 });
            owner.webContents.sendInputEvent({ type: "mouseUp", x, y, button: "left", clickCount: 1 });
            await delay(100);
        }
        const extraWindows = () => BrowserWindow.getAllWindows().filter((w) => w !== owner);
        let prepared;
        for (const mode of ["screen", "area"]) {
            const before = calls;
            await click('button[aria-label="Ekran Alıntısı"]');
            assert.equal(extraWindows().length, 1, "opening the palette must prepare one hidden selection window");
            assert(!prepared || extraWindows()[0] === prepared, "reopening the palette must reuse the prepared window");
            prepared = extraWindows()[0];
            // Palet açıkken seçim penceresi ekranda görünmemeli (Pardus'ta beyaz pencere açılıyordu).
            await delay(500);
            assert.equal(prepared.isVisible(), false, "opening the palette showed the selection window");
            assert.equal(await evaluate('document.querySelector(".sidebar__capture-palette").hidden'), false);
            assert.equal(calls, before, "clicking capture icon must only open palette");
            console.log("PASS: real Electron mouse click opens palette without capture");
            await click(`.sidebar__capture-palette button[aria-label="${mode === "screen" ? "Tam Ekran" : "Alan"}"]`);
            if (mode === "area") {
                let overlay;
                await until(() => prepared.isVisible(), "visible selection overlay");
                await until(() => prepared.isFullScreen(), "full-screen selection overlay");
                overlay = prepared;
                assert.deepEqual(extraWindows(), [prepared], "area capture must use the prepared window");
                overlay.focus();
                await until(() => overlay.isFocused(), "selection focus");
                await delay(500);
                trace.push({ selectionBounds: overlay.getBounds(), viewport: await overlay.webContents.executeJavaScript(
                    '({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio })') });
                overlay.webContents.debugger.attach("1.3");
                await overlay.webContents.debugger.sendCommand("Input.dispatchMouseEvent", { type: "mousePressed", x: 200, y: 200, button: "left", buttons: 1, clickCount: 1 });
                await overlay.webContents.debugger.sendCommand("Input.dispatchMouseEvent", { type: "mouseMoved", x: 600, y: 500, button: "left", buttons: 1 });
                // Completing selection destroys the window, which may detach the debugger before its reply.
                await overlay.webContents.debugger.sendCommand("Input.dispatchMouseEvent", { type: "mouseReleased", x: 600, y: 500, button: "left", buttons: 0, clickCount: 1 }).catch(() => {});
            }
            await until(() => results.length > before, "capture result");
            assert.equal(results.at(-1).status, "ok", JSON.stringify(results.at(-1)));
            await until(() => evaluate('!document.querySelector(\'button[aria-label="Ekran Alıntısı"]\').disabled'), "canvas insertion");
            assert.equal(await evaluate('Boolean(document.querySelector(".modal"))'), false);
            assert.equal(await evaluate('document.querySelector(\'button[aria-label="Geri Al"]\').disabled'), false);
            assert.equal(owner.isVisible(), true);
            assert.equal(extraWindows().length, mode === "screen" ? 1 : 0,
                mode === "screen" ? "full screen keeps the prepared window" : "used selection window must be destroyed");
            const display = screen.getDisplayMatching(owner.getBounds());
            const scale = display.scaleFactor;
            assert.deepEqual(results.at(-1), mode === "screen"
                ? { status: "ok", width: Math.round(display.bounds.width * scale), height: Math.round(display.bounds.height * scale) }
                : { status: "ok", width: Math.round(600 * scale) - Math.round(200 * scale), height: Math.round(500 * scale) - Math.round(200 * scale) });
            console.log("PASS:", mode, JSON.stringify(results.at(-1)), "inserted on canvas; undo enabled");
            await delay(300);
        }
    } catch (error) {
        console.error("FAIL:", error.stack);
        console.error("Events:", JSON.stringify(trace));
        code = 1;
    } finally {
        clearTimeout(timer);
        finish(code);
    }
});
