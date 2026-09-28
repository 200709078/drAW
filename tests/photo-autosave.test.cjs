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
const { Document } = require("../src/document/Document.ts");
const { HistoryManager } = require("../src/core/HistoryManager.ts");
const { AutoSaveManager } = require("../src/autosave/AutoSaveManager.ts");
const { DrawingRepository } = require("../src/storage/DrawingRepository.ts");
const { LinkedPhotoManager } = require("../src/photos/LinkedPhotoManager.ts");
if (previousTsLoader === undefined) delete require.extensions[".ts"];
else require.extensions[".ts"] = previousTsLoader;

function fixture(t) {
    const local = new Map();
    const globals = { window: Object.getOwnPropertyDescriptor(global, "window"), document: Object.getOwnPropertyDescriptor(global, "document") };
    global.document = { createElement: () => ({}), body: { appendChild() {} } };
    global.window = {
        innerHeight: 800,
        localStorage: {
            getItem: (key) => local.get(key) ?? null,
            setItem: (key, value) => local.set(key, value),
            removeItem: (key) => local.delete(key)
        },
        drAWDesktop: { photoFolder: {
            async selectPhoto() { return { folderPath: "/photos", fileName: "1.png" }; },
            async listPhotos() { return ["1.png", "2.png", "3.png"]; },
            async readPhoto(_folder, name) { return { dataUrl: `data:image/png;base64,${name}`, width: 100, height: 100 }; }
        } }
    };
    const records = new Map();
    const storage = {
        async save(record) { records.set(record.getId(), record); },
        async list() { return [...records.values()]; },
        async delete(id) { records.delete(id); }
    };
    const document = new Document();
    const history = new HistoryManager(document);
    const auto = new AutoSaveManager(new DrawingRepository(storage), document, history);
    const photos = new LinkedPhotoManager(document, { render() {} }, () => auto.markDirty());
    photos.setHistoryManager(history);
    t.after(() => {
        auto.stopAutoSave();
        for (const [key, descriptor] of Object.entries(globals)) {
            if (descriptor) Object.defineProperty(global, key, descriptor);
            else delete global[key];
        }
    });
    return {
        photos, auto, document, history, local, storage, records,
        storedPhoto: () => records.get(auto.getActiveDocument().getId()).getCanvasState().getData().images[0].dataUrl,
        linkedName: () => JSON.parse(local.get("draw:photo-link")).fileName,
        async step(direction) {
            photos.requestStepPhoto(direction);
            await new Promise(setImmediate);
        }
    };
}

test("adding only a linked photo creates a dirty drawing and saves without an undo entry", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    assert.equal(f.auto.isDirty(), true);
    assert.notEqual(f.auto.getActiveDocument(), null);
    assert.equal(f.history.canUndo(), false);
    await f.auto.saveIfNeeded();
    assert.equal(f.storedPhoto(), "data:image/png;base64,1.png");
    assert.equal(f.auto.isDirty(), false);
});

test("changing the linked photo updates its saved content without changing undo history", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    await f.auto.saveIfNeeded();
    await f.step(1);
    assert.equal(f.auto.isDirty(), true);
    assert.equal(f.history.canUndo(), false);
    await f.auto.saveIfNeeded();
    assert.equal(f.storedPhoto(), "data:image/png;base64,2.png");
    assert.equal(f.records.size, 1);
    assert.equal(f.auto.isDirty(), false);
});

test("restoring a folder link saves the automatically inserted photo", async (t) => {
    const f = fixture(t);
    f.local.set("draw:photo-link", JSON.stringify({ folderPath: "/photos", fileName: "1.png" }));
    await f.photos.restore();
    assert.equal(f.auto.isDirty(), true);
    await f.auto.saveIfNeeded();
    assert.equal(f.storedPhoto(), "data:image/png;base64,2.png");
    assert.equal(f.history.canUndo(), false);
});

test("new drawing saves its prepared photo after resetting the active record", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    const nextPhoto = await f.photos.prepareNewDrawing();
    await f.auto.newDrawing();
    f.document.clearCurrentPage();
    f.history.reset();
    f.auto.resetActiveDocument();
    f.photos.placePreparedPhoto(nextPhoto);
    assert.equal(f.auto.isDirty(), true);
    await f.auto.saveIfNeeded();
    assert.equal(f.storedPhoto(), "data:image/png;base64,2.png");
    assert.equal(f.records.size, 2);
    assert.equal(f.history.canUndo(), false);
});

test("a failed new drawing save does not advance the prepared photo", async (t) => {
    const f = fixture(t);
    t.mock.method(console, "error", () => {});
    await f.photos.toggle();
    await f.photos.prepareNewDrawing();
    assert.equal(f.linkedName(), "1.png", "preparing a photo must not advance the current link");
    t.mock.method(f.storage, "save", async () => { throw new Error("Disk full"); });
    await assert.rejects(f.auto.newDrawing(), /Disk full/);
    f.photos.cancelPreparedNewDrawing();
    assert.equal(f.linkedName(), "1.png");
    assert.equal(f.document.getCurrentPage().getImages()[0].getDataUrl(), "data:image/png;base64,1.png");
    assert.equal(f.auto.isDirty(), true);
    // Cancellation also restores normal detection when the holder is removed.
    f.document.clearCurrentPage();
    f.history.reset();
    assert.equal(f.photos.isLinked(), false);
});

test("preparing a new drawing at the last photo keeps the link until transition succeeds", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    await f.step(1);
    await f.step(1);
    const prepared = await f.photos.prepareNewDrawing();
    assert.equal(prepared, null);
    assert.equal(f.photos.isLinked(), true);
    assert.equal(f.linkedName(), "3.png");
    f.photos.cancelPreparedNewDrawing();
    assert.equal(f.photos.isLinked(), true);
    await f.photos.prepareNewDrawing();
    await f.auto.newDrawing();
    f.document.clearCurrentPage();
    f.history.reset();
    f.auto.resetActiveDocument();
    f.photos.placePreparedPhoto(null);
    assert.equal(f.photos.isLinked(), false);
    assert.equal(f.auto.isDirty(), false);
});

test("a photo changed during an in-flight save is persisted by the follow-up write", async (t) => {
    const f = fixture(t);
    const write = f.storage.save.bind(f.storage);
    let started;
    const entered = new Promise((resolve) => { started = resolve; });
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    let writes = 0;
    t.mock.method(f.storage, "save", async (record) => {
        if (++writes === 1) {
            started();
            await gate;
        }
        await write(record);
    });
    await f.photos.toggle();
    const saving = f.auto.saveIfNeeded();
    await entered;
    await f.step(1);
    release();
    await saving;
    assert.equal(f.storedPhoto(), "data:image/png;base64,2.png");
    assert.equal(writes, 2);
    assert.equal(f.auto.isDirty(), false);
});
