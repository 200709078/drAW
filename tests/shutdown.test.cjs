const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const ts = require("typescript");

function load(filename, dependencies = {}) {
    const source = readFileSync(`${__dirname}/../${filename}`, "utf8");
    const code = filename.endsWith(".ts") ? ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText : source;
    const module = { exports: {} };
    new Function("require", "module", "exports", code)(
        (id) => dependencies[id] ?? require(id), module, module.exports
    );
    return module.exports;
}

const { registerWindowShutdown } = load("electron/window-shutdown.ts");

function setWindow(t, window) {
    const previous = Object.getOwnPropertyDescriptor(global, "window");
    Object.defineProperty(global, "window", { value: window, configurable: true });
    t.after(() => {
        if (previous) Object.defineProperty(global, "window", previous);
        else delete global.window;
    });
}

class WindowStub extends EventEmitter {
    closed = false;
    messages = [];
    webContents = { send: (channel) => this.messages.push(channel) };

    close() {
        const event = new Event("close", { cancelable: true });
        this.emit("close", event);
        if (!event.defaultPrevented) {
            this.closed = true;
            this.emit("closed");
        }
    }
}

test("a slow save and repeated close clicks cannot force an Electron window closed", (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const ipc = new EventEmitter();
    const window = new WindowStub();
    registerWindowShutdown(window, ipc);
    window.close();
    window.close();
    t.mock.timers.tick(30000);
    assert.equal(window.closed, false);
    assert.deepEqual(window.messages, ["app:shutdown-request"]);

    ipc.emit("app:shutdown-complete", { sender: window.webContents });
    assert.equal(window.closed, true);
    assert.equal(ipc.listenerCount("app:shutdown-complete"), 0);
    assert.equal(ipc.listenerCount("app:shutdown-cancelled"), 0);
});

test("Electron cancels a failed close and accepts a later successful retry", () => {
    const ipc = new EventEmitter();
    const window = new WindowStub();
    registerWindowShutdown(window, ipc);
    window.close();
    ipc.emit("app:shutdown-cancelled", { sender: window.webContents });
    assert.equal(window.closed, false);
    // A late completion for the cancelled request must not close the window.
    ipc.emit("app:shutdown-complete", { sender: window.webContents });
    assert.equal(window.closed, false);
    window.close();
    assert.equal(window.messages.length, 2);
    ipc.emit("app:shutdown-complete", { sender: window.webContents });
    assert.equal(window.closed, true);
});

test("shutdown messages from another window cannot approve or cancel a close", () => {
    const ipc = new EventEmitter();
    const window = new WindowStub();
    registerWindowShutdown(window, ipc);
    ipc.emit("app:shutdown-complete", { sender: window.webContents });
    assert.equal(window.closed, false);
    window.close();
    ipc.emit("app:shutdown-cancelled", { sender: {} });
    ipc.emit("app:shutdown-complete", { sender: {} });
    window.close();
    assert.equal(window.closed, false);
    assert.equal(window.messages.length, 1);
});

test("renderer cancels shutdown on save failure, reports it, and completes only on success", async (t) => {
    let request;
    let completed = 0;
    let cancelled = 0;
    const errors = [];
    const window = Object.assign(new EventTarget(), {
        drAWDesktop: {
            onShutdownRequest(callback) { request = callback; },
            shutdownComplete() { completed++; },
            shutdownCancelled() { cancelled++; }
        }
    });
    setWindow(t, window);
    const { registerShutdownHandlers } = load("src/core/ShutdownHandlers.ts", {
        "../ui/StorageErrorDialog": { showStorageError: async (error) => { errors.push(error); } }
    });
    const failure = new Error("Disk full");
    let fail = true;
    registerShutdownHandlers({ async shutdown() { if (fail) throw failure; } });
    request();
    await new Promise(setImmediate);
    assert.equal(completed, 0);
    assert.equal(cancelled, 1);
    assert.deepEqual(errors, [failure]);

    fail = false;
    request();
    await new Promise(setImmediate);
    assert.equal(completed, 1);
    assert.equal(cancelled, 1);
});

test("desktop reload and pagehide still attempt to save without an unhandled rejection", async (t) => {
    const window = Object.assign(new EventTarget(), { drAWDesktop: { onShutdownRequest() {} } });
    setWindow(t, window);
    const { registerShutdownHandlers } = load("src/core/ShutdownHandlers.ts", {
        "../ui/StorageErrorDialog": { showStorageError: async () => {} }
    });
    let attempts = 0;
    registerShutdownHandlers({
        isDirty: () => true,
        async saveIfNeeded() { attempts++; throw new Error("Disk full"); }
    });
    window.dispatchEvent(new Event("beforeunload"));
    window.dispatchEvent(new Event("pagehide"));
    await new Promise(setImmediate);
    assert.equal(attempts, 2);
});

test("browser unload warns about unsaved changes and handles save rejection", async (t) => {
    const window = new EventTarget();
    setWindow(t, window);
    const { registerShutdownHandlers } = load("src/core/ShutdownHandlers.ts", {
        "../ui/StorageErrorDialog": { showStorageError: async () => {} }
    });
    let dirty = true;
    let attempts = 0;
    registerShutdownHandlers({
        isDirty: () => dirty,
        async saveIfNeeded() { attempts++; throw new Error("Disk full"); }
    });
    const unsaved = new Event("beforeunload", { cancelable: true });
    Object.defineProperty(unsaved, "returnValue", { value: "", writable: true });
    window.dispatchEvent(unsaved);
    window.dispatchEvent(new Event("pagehide"));
    await new Promise(setImmediate);
    assert.equal(unsaved.defaultPrevented, true);
    assert.equal(attempts, 2);

    dirty = false;
    const saved = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(saved);
    assert.equal(saved.defaultPrevented, false);
    assert.equal(attempts, 2);
});

for (const filename of ["electron/preload.ts", "electron/preload.cjs"]) {
    test(`${filename} exposes both shutdown outcomes on the correct IPC channels`, () => {
        let bridge;
        const sent = [];
        load(filename, { electron: {
            contextBridge: { exposeInMainWorld(_name, api) { bridge = api; } },
            ipcRenderer: { send(channel) { sent.push(channel); } }
        } });
        bridge.shutdownComplete();
        bridge.shutdownCancelled();
        assert.deepEqual(sent, ["app:shutdown-complete", "app:shutdown-cancelled"]);
    });
}
