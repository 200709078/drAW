const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const ts = require("typescript");

// AndroidApp.ts'yi taklit Capacitor modülleriyle yükler.
function load(platform) {
    const listeners = new Map();
    const calls = [];
    const capacitorApp = {
        App: {
            addListener: async (name, listener) => { listeners.set(name, listener); },
            minimizeApp: async () => { calls.push("minimize"); }
        }
    };
    const capacitorCore = { Capacitor: { getPlatform: () => platform } };
    const source = readFileSync(`${__dirname}/../src/platform/AndroidApp.ts`, "utf8");
    const code = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    const module = { exports: {} };
    const modules = { "@capacitor/app": capacitorApp, "@capacitor/core": capacitorCore };
    new Function("require", "module", "exports", code)((name) => modules[name], module, module.exports);
    return { ...module.exports, listeners, calls };
}

test("Android: back closes what is open, otherwise minimizes; pause saves", async () => {
    const android = load("android");
    assert.equal(android.isAndroidApp(), true);
    let open = 2;
    let paused = 0;
    android.bindAndroid({
        back: () => open-- > 0,
        pause: () => { paused++; }
    });
    for (let i = 0; i < 2; i++) android.listeners.get("backButton")();
    assert.deepEqual(android.calls, [], "back must close open things before leaving the app");
    android.listeners.get("backButton")();
    assert.deepEqual(android.calls, ["minimize"], "back with nothing open sends the app to the background");
    android.listeners.get("pause")();
    assert.equal(paused, 1);
});

for (const platform of ["web", "electron"]) {
    test(`${platform}: Android listeners are not installed`, () => {
        const other = load(platform);
        assert.equal(other.isAndroidApp(), false);
        other.bindAndroid({ back: () => false, pause: () => {} });
        assert.equal(other.listeners.size, 0);
    });
}
