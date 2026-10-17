// npm run build
// dbus-run-session -- env ELECTRON_RUN_AS_NODE= npx electron --no-sandbox tests/screen-keyboard-electron.cjs
// Uses a private D-Bus session, mock ETA/Onboard services, real Electron/preload and temporary drawings.
// Requires /usr/bin/python3 with dbus and gi. Does not start the user's keyboard or change its settings.
const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const profile = mkdtempSync(path.join(tmpdir(), "draw-keyboard-test-"));
app.setPath("userData", profile);
app.on("window-all-closed", () => {});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, label) {
    for (let i = 0; i < 100; i++) {
        if (await check()) return;
        await delay(50);
    }
    throw new Error(`Timed out: ${label}`);
}

// These are the upstream D-Bus signatures, including ETA's required boolean argument.
const python = `
import sys, dbus, dbus.service
from dbus.mainloop.glib import DBusGMainLoop
from gi.repository import GLib
DBusGMainLoop(set_as_default=True)
bus = dbus.SessionBus()
eta = sys.argv[1] == 'eta'
name = dbus.service.BusName('org.eta.virtualkeyboard' if eta else 'org.onboard.Onboard', bus)
class Eta(dbus.service.Object):
    @dbus.service.method('org.eta.virtualkeyboard', in_signature='b', out_signature='')
    def showForce(self, password):
        assert not password
        print('show', flush=True)
    @dbus.service.method('org.eta.virtualkeyboard', in_signature='', out_signature='')
    def hide(self):
        print('hide', flush=True)
class Onboard(dbus.service.Object):
    @dbus.service.method('org.onboard.Onboard.Keyboard', in_signature='', out_signature='')
    def Show(self):
        print('show', flush=True)
    @dbus.service.method('org.onboard.Onboard.Keyboard', in_signature='', out_signature='')
    def Hide(self):
        print('hide', flush=True)
keyboard = Eta(bus, '/VirtualKeyboard') if eta else Onboard(bus, '/org/onboard/Onboard/Keyboard')
print('ready', flush=True)
GLib.MainLoop().run()
`;

let child;
let owner;
const timer = setTimeout(() => { console.error("FAIL: keyboard integration timeout"); finish(1); }, 35000);
function finish(code) {
    child?.kill();
    for (const window of BrowserWindow.getAllWindows()) window.destroy();
    rmSync(profile, { recursive: true, force: true });
    clearTimeout(timer);
    app.exit(code);
}

app.whenReady().then(async () => {
    try {
        const { ScreenKeyboardService } = await import(pathToFileURL(path.join(root, "electron/screen-keyboard.ts")));
        const service = new ScreenKeyboardService();
        service.register(ipcMain);
        const saved = new Map();
        ipcMain.handle("storage:list", () => ({ ok: true, value: [] }));
        ipcMain.handle("storage:save", (_e, document) => { saved.set(document.id, document); return { ok: true }; });
        ipcMain.handle("storage:load", (_e, id) => ({ ok: true, value: saved.get(id) ?? null }));
        ipcMain.handle("window:is-fullscreen", () => true);
        owner = new BrowserWindow({ show: false, frame: false, fullscreen: true,
            webPreferences: { preload: path.join(root, "electron/preload.cjs"), contextIsolation: true, nodeIntegration: false } });
        service.allowWindow(owner);
        const evaluate = (expression) => owner.webContents.executeJavaScript(expression);
        async function click(x, y) {
            owner.webContents.sendInputEvent({ type: "mouseDown", x, y, button: "left", clickCount: 1 });
            owner.webContents.sendInputEvent({ type: "mouseUp", x, y, button: "left", clickCount: 1 });
            await delay(80);
        }
        for (const provider of ["eta", "onboard"]) {
            let output = "";
            child = spawn("/usr/bin/python3", ["-u", "-c", python, provider], { stdio: ["ignore", "pipe", "inherit"] });
            child.stdout.on("data", (chunk) => { output += chunk; });
            await until(() => output.includes("ready"), `${provider} service`);
            await owner.loadFile(path.join(root, "dist/index.html"), { query: { tahta: "1" } });
            owner.show(); owner.focus();
            await until(() => owner.isFocused(), "window focus");
            await evaluate('document.querySelector(\'button[aria-label="Metin"]\').click()');
            await click(250, 200);
            await until(() => output.includes("show"), `${provider} show from text editor`);
            assert.equal(await evaluate('document.activeElement?.className'), "text-editor");
            await owner.webContents.insertText("Tahtada çğıöşü");
            assert.equal(await evaluate('document.querySelector(".text-editor").value'), "Tahtada çğıöşü");
            assert(owner.isFullScreen(), "opening the keyboard left fullscreen");
            owner.webContents.sendInputEvent({ type: "keyDown", keyCode: "ESC" });
            owner.webContents.sendInputEvent({ type: "keyUp", keyCode: "ESC" });
            await until(() => output.includes("hide"), `${provider} hide after edit`);
            assert.equal(await evaluate('Boolean(document.querySelector(".text-editor"))'), false);
            await click(275, 200); await click(275, 200);
            await until(() => output.split("show").length === 3, `${provider} existing text edit`);
            assert.equal(await evaluate('document.querySelector(".text-editor").value'), "Tahtada çğıöşü");
            assert(owner.isFullScreen());
            await evaluate('document.querySelector(\'button[aria-label="Yeni Çizim"]\').click()');
            await until(() => output.split("hide").length === 3, `${provider} new drawing`);
            assert.equal(await evaluate('Boolean(document.querySelector(".text-editor"))'), false);
            assert.equal(await evaluate('Boolean(document.querySelector(".text-editor-status"))'), false);
            console.log(`PASS: ${provider}: native D-Bus, preload, fullscreen text entry/editing, focus, Turkish input and cleanup`);
            const exited = once(child, "exit"); child.kill(); await exited; child = null;
        }
        finish(0);
    } catch (error) { console.error(error); finish(1); }
});
