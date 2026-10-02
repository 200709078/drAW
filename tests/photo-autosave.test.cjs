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
const { DocumentImage } = require("../src/document/DocumentImage.ts");
const { Point } = require("../src/document/Point.ts");
const { Stroke } = require("../src/document/Stroke.ts");
const { DrawingContext } = require("../src/models/DrawingContext.ts");
const { EraserTool } = require("../src/tools/EraserTool.ts");
const { PartialEraserTool } = require("../src/tools/PartialEraserTool.ts");
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
        draw() {
            history.begin();
            const stroke = new Stroke();
            stroke.addPoint(new Point(50, 60));
            document.getCurrentPage().addStroke(stroke);
            history.commit();
        },
        async step(direction) {
            photos.requestStepPhoto(direction);
            await new Promise(setImmediate);
        }
    };
}

async function storeOtherDrawing(f, withIdenticalPhoto = false) {
    if (withIdenticalPhoto) {
        f.document.getCurrentPage().addImage(new DocumentImage("data:image/png;base64,1.png", 16, 16, 400, 400));
    }
    f.draw();
    await f.auto.saveIfNeeded();
    const stored = f.auto.getActiveDocument();
    f.document.clearCurrentPage();
    f.history.reset();
    f.auto.resetActiveDocument();
    return stored;
}

for (const ToolClass of [PartialEraserTool, EraserTool]) {
    for (const pointerType of ["touch", "pen", "mouse"]) {
        test(`${ToolClass.name} ${pointerType}: erasing writing on a linked photo preserves the intended photo and folder state`, async (t) => {
            const f = fixture(t);
            await f.photos.toggle();
            f.history.begin();
            const stroke = new Stroke();
            for (const x of [50, 100, 150, 200, 250]) stroke.addPoint(new Point(x, 100, 1));
            f.document.getCurrentPage().addStroke(stroke);
            f.history.commit();
            await f.auto.saveIfNeeded();
            const tool = new ToolClass(new DrawingContext({}, {}), f.document, { render() {} }, f.history);
            if (ToolClass === PartialEraserTool) {
                tool.setImageProtection((image) => f.photos.isLinkedHolder(image));
            }
            tool.setLineWidth(6);
            const event = { pointerId: 1, pointerType, offsetX: 150, offsetY: 100 };
            tool.onPointerDown(event);
            tool.onPointerUp(event);

            const preservePhoto = ToolClass === PartialEraserTool;
            const assertPhotoState = () => {
                assert.equal(f.document.getCurrentPage().getImages().length, preservePhoto ? 1 : 0);
                assert.equal(f.photos.isLinked(), preservePhoto);
                if (preservePhoto) {
                    assert.equal(f.photos.isLinkedHolder(f.document.getCurrentPage().getImages()[0]), true);
                    assert.equal(f.linkedName(), "1.png");
                } else {
                    assert.equal(f.local.has("draw:photo-link"), false);
                }
                assert.equal(f.local.get("draw:photo-last-folder"), "/photos");
            };
            assertPhotoState();
            assert.equal(f.document.getCurrentPage().getStrokes().length, preservePhoto ? 2 : 0);
            assert.equal(f.auto.isDirty(), true);
            await f.auto.saveIfNeeded();
            const saved = f.records.get(f.auto.getActiveDocument().getId()).getCanvasState().getData();
            assert.equal(saved.images.length, preservePhoto ? 1 : 0);
            assert.equal(saved.strokes.length, preservePhoto ? 2 : 0);

            assert.equal(f.history.undo(), true);
            assert.equal(f.document.getCurrentPage().getImages().length, 1);
            assert.equal(f.document.getCurrentPage().getStrokes()[0].getPoints().length, 5);
            assert.equal(f.photos.isLinked(), preservePhoto, "undo changed the intended folder connection");
            assert.equal(f.history.redo(), true);
            assertPhotoState();
            if (preservePhoto) {
                await f.step(1);
                assert.equal(f.linkedName(), "2.png", "normal erasing disabled photo navigation");
            }
        });
    }
}

test("normal erasing protects only the linked holder when an identical ordinary photo overlaps it", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    const holder = f.document.getCurrentPage().getImages()[0];
    f.document.getCurrentPage().addImage(new DocumentImage(
        holder.getDataUrl(), holder.getX(), holder.getY(), holder.getWidth(), holder.getHeight()
    ));
    const tool = new PartialEraserTool(new DrawingContext({}, {}), f.document, { render() {} }, f.history);
    tool.setImageProtection((image) => f.photos.isLinkedHolder(image));
    const event = { pointerId: 1, pointerType: "touch", offsetX: 150, offsetY: 100 };
    tool.onPointerDown(event);
    tool.onPointerUp(event);
    assert.deepEqual(f.document.getCurrentPage().getImages(), [holder]);
    assert.equal(f.photos.isLinked(), true);
    assert.equal(f.history.undo(), true);
    assert.equal(f.document.getCurrentPage().getImages().length, 2);
    assert.equal(f.photos.isLinkedHolder(f.document.getCurrentPage().getImages()[0]), true);
});

test("normal erasing can remove a photo after its folder is manually unlinked", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    await f.photos.toggle();
    const tool = new PartialEraserTool(new DrawingContext({}, {}), f.document, { render() {} }, f.history);
    tool.setImageProtection((image) => f.photos.isLinkedHolder(image));
    const event = { pointerId: 1, pointerType: "touch", offsetX: 150, offsetY: 100 };
    tool.onPointerDown(event);
    tool.onPointerUp(event);
    assert.equal(f.document.getCurrentPage().getImages().length, 0);
    assert.equal(f.photos.isLinked(), false);
    assert.equal(f.local.get("draw:photo-last-folder"), "/photos");
    assert.equal(f.history.undo(), true);
    assert.equal(f.document.getCurrentPage().getImages().length, 1);
    assert.equal(f.photos.isLinked(), false);
});

for (const withIdenticalPhoto of [false, true]) {
    test(`opening another drawing ${withIdenticalPhoto ? "with an identical photo" : "without photos"} clears the old link and remembers its folder`, async (t) => {
        const f = fixture(t);
        const stored = await storeOtherDrawing(f, withIdenticalPhoto);
        await f.photos.toggle();
        f.draw();
        const previousId = f.auto.getActiveDocument().getId();
        const resetViews = [];
        f.history.addChangeListener((change) => {
            if (change === "reset") {
                resetViews.push({
                    id: f.auto.getActiveDocument().getId(),
                    images: f.document.getCurrentPage().getImages().length
                });
            }
        });

        await f.auto.openDrawing(stored);

        assert.equal(f.photos.isLinked(), false, "the previous drawing's photo link remained active");
        assert.equal(f.local.has("draw:photo-link"), false);
        assert.equal(f.local.get("draw:photo-last-folder"), "/photos");
        assert.equal(f.photos.canStepPhoto(-1), false);
        assert.equal(f.photos.canStepPhoto(1), false);
        assert.equal(f.history.canUndo(), false);
        assert.equal(f.auto.isDirty(), false);
        assert.deepEqual(resetViews, [{ id: stored.getId(), images: withIdenticalPhoto ? 1 : 0 }]);
        assert.equal(f.records.get(previousId).getCanvasState().getData().images[0].dataUrl, "data:image/png;base64,1.png");
        assert.equal(f.records.get(previousId).getCanvasState().getData().strokes.length, 1);
        const images = f.document.getCurrentPage().getImages();
        assert.equal(images.length, withIdenticalPhoto ? 1 : 0);
        assert.equal(images.some((image) => f.photos.isLinkedHolder(image)), false);
        await f.step(1);
        assert.equal(images.length, withIdenticalPhoto ? 1 : 0, "old photo navigation changed the opened drawing");

        const picker = t.mock.method(window.drAWDesktop.photoFolder, "selectPhoto");
        await f.photos.toggle();
        assert.equal(picker.mock.callCount(), 1, "the first reconnect click only cleared a stale link");
        assert.equal(picker.mock.calls[0].arguments[0], "/photos");
        assert.equal(f.photos.isLinked(), true);
    });
}

for (const failure of ["save", "deserialize"]) {
    test(`failed ${failure} while opening another drawing preserves the current photo link and allows retry`, async (t) => {
        const f = fixture(t);
        t.mock.method(console, "error", () => {});
        const stored = await storeOtherDrawing(f);
        await f.photos.toggle();
        f.draw();
        const image = f.document.getCurrentPage().getImages()[0];
        const activeId = f.auto.getActiveDocument().getId();
        const link = f.local.get("draw:photo-link");
        const failingMethod = failure === "save"
            ? t.mock.method(f.storage, "save", async () => { throw new Error("Disk full"); })
            : t.mock.method(stored.getCanvasState(), "getData", () => ({}));

        await assert.rejects(f.auto.openDrawing(stored), /Disk full|bozuk/);

        assert.equal(f.auto.getActiveDocument().getId(), activeId);
        assert.equal(f.document.getCurrentPage().getImages()[0], image);
        assert.equal(f.document.getCurrentPage().getStrokes().length, 1);
        assert.equal(f.photos.isLinkedHolder(image), true);
        assert.equal(f.local.get("draw:photo-link"), link);
        assert.equal(f.history.canUndo(), true);
        failingMethod.mock.restore();
        await f.auto.openDrawing(stored);
        assert.equal(f.auto.getActiveDocument().getId(), stored.getId());
        assert.equal(f.photos.isLinked(), false);
    });
}

test("opening the already active drawing keeps its photo link and unsaved changes", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    await f.auto.saveIfNeeded();
    const stored = f.auto.getActiveDocument();
    f.draw();
    const image = f.document.getCurrentPage().getImages()[0];
    await f.auto.openDrawing(stored);
    assert.equal(f.photos.isLinkedHolder(image), true);
    assert.equal(f.document.getCurrentPage().getStrokes().length, 1);
    assert.equal(f.history.canUndo(), true);
    assert.equal(f.auto.isDirty(), true);
});

for (const phase of ["listPhotos", "readPhoto"]) {
    for (const change of ["open drawing", "delete photo", "new drawing"]) {
        test(`a pending ${phase} navigation cannot change the page after ${change}`, async (t) => {
            const f = fixture(t);
            const stored = await storeOtherDrawing(f, true);
            await f.photos.toggle();
            f.draw();
            const holder = f.document.getCurrentPage().getImages()[0];
            const notice = t.mock.method(f.photos, "showInfo", async () => {});
            const original = window.drAWDesktop.photoFolder[phase];
            let release;
            const gate = new Promise((resolve) => { release = resolve; });
            t.mock.method(window.drAWDesktop.photoFolder, phase, async (...args) => {
                await gate;
                return original(...args);
            });
            const stepping = f.photos.stepPhoto(1);
            if (phase === "readPhoto") await new Promise(setImmediate);
            try {
                if (change === "open drawing") {
                    await f.auto.openDrawing(stored);
                } else if (change === "delete photo") {
                    f.history.begin();
                    f.document.getCurrentPage().removeImage(holder);
                    f.history.commit();
                } else {
                    await f.auto.newDrawing();
                    f.document.clearCurrentPage();
                    f.history.reset();
                    f.auto.resetActiveDocument();
                    f.photos.placePreparedPhoto(null);
                }
                assert.equal(f.photos.isLinked(), false);
                const before = f.document.createSnapshot();
                const activeId = f.auto.getActiveDocument().getId();
                const dirty = f.auto.isDirty();
                release();
                await stepping;
                assert.equal(f.document.snapshotsMatch(before, f.document.createSnapshot()), true,
                    "a late photo result changed a different drawing");
                assert.equal(f.auto.getActiveDocument().getId(), activeId);
                assert.equal(f.auto.isDirty(), dirty);
                assert.equal(f.local.has("draw:photo-link"), false);
                assert.equal(notice.mock.callCount(), 0, "an obsolete operation showed a misleading error");
            } finally {
                release();
                await stepping;
            }
        });
    }
}

test("undo during a pending photo read keeps navigation valid for the same drawing", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    f.draw();
    const original = window.drAWDesktop.photoFolder.readPhoto;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    t.mock.method(window.drAWDesktop.photoFolder, "readPhoto", async (...args) => {
        await gate;
        return original(...args);
    });
    const stepping = f.photos.stepPhoto(1);
    await new Promise(setImmediate);
    try {
        f.history.undo();
        release();
        await stepping;
        assert.equal(f.photos.isLinked(), true);
        assert.equal(f.linkedName(), "2.png");
        assert.equal(f.document.getCurrentPage().getImages().length, 1);
        assert.equal(f.photos.isLinkedHolder(f.document.getCurrentPage().getImages()[0]), true);
        assert.equal(f.document.getCurrentPage().getStrokes().length, 0);
        await f.auto.saveIfNeeded();
        assert.equal(f.storedPhoto(), "data:image/png;base64,2.png");
    } finally {
        release();
        await stepping;
    }
});

test("an old navigation refresh cannot disable the arrows of a newly linked folder", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    t.mock.method(window.drAWDesktop.photoFolder, "listPhotos", (folder) => {
        return folder === "/photos" ? gate : Promise.resolve(["1.png", "2.png"]);
    });
    const refreshing = f.photos.refreshNavState();
    try {
        await f.photos.toggle();
        t.mock.method(window.drAWDesktop.photoFolder, "selectPhoto", async () => ({
            folderPath: "/other-photos", fileName: "1.png"
        }));
        await f.photos.toggle();
        release([]);
        await refreshing;
        assert.equal(f.photos.isLinked(), true);
        assert.equal(f.photos.canStepPhoto(1), true);
        assert.equal(JSON.parse(f.local.get("draw:photo-link")).folderPath, "/other-photos");
    } finally {
        release([]);
        await refreshing;
    }
});

for (const phase of ["selectPhoto", "readPhoto"]) {
    for (const change of ["open drawing", "new drawing"]) {
        test(`a pending folder link ${phase} cannot attach to a different page after ${change}`, async (t) => {
            const f = fixture(t);
            const stored = await storeOtherDrawing(f);
            f.draw();
            const original = window.drAWDesktop.photoFolder[phase];
            let release;
            const gate = new Promise((resolve) => { release = resolve; });
            const access = t.mock.method(window.drAWDesktop.photoFolder, phase, async (...args) => {
                await gate;
                return original(...args);
            });
            const linking = f.photos.toggle();
            if (phase === "readPhoto") await new Promise(setImmediate);
            try {
                if (change === "open drawing") {
                    await f.auto.openDrawing(stored);
                } else {
                    await f.auto.newDrawing();
                    f.document.clearCurrentPage();
                    f.history.reset();
                    f.auto.resetActiveDocument();
                    f.photos.placePreparedPhoto(null);
                }
                const before = f.document.createSnapshot();
                const activeId = f.auto.getActiveDocument().getId();
                release();
                await linking;
                assert.equal(f.document.snapshotsMatch(before, f.document.createSnapshot()), true,
                    "a cancelled folder link inserted a photo into another drawing");
                assert.equal(f.auto.getActiveDocument().getId(), activeId);
                assert.equal(f.auto.isDirty(), false);
                assert.equal(f.photos.isLinked(), false);
                assert.equal(f.local.has("draw:photo-link"), false);
                access.mock.restore();
                await f.photos.toggle();
                assert.equal(f.photos.isLinked(), true, "cancelling the pending link blocked a later reconnect");
                assert.equal(f.document.getCurrentPage().getImages().length, 1);
            } finally {
                release();
                await linking;
            }
        });
    }
}

test("starting a manual folder picker cancels an older restore before the picker returns", async (t) => {
    const f = fixture(t);
    f.local.set("draw:photo-link", JSON.stringify({ folderPath: "/photos", fileName: "1.png" }));
    let releaseRestore;
    const restoreGate = new Promise((resolve) => { releaseRestore = resolve; });
    const originalRead = window.drAWDesktop.photoFolder.readPhoto;
    t.mock.method(window.drAWDesktop.photoFolder, "readPhoto", async (folder, name) => {
        if (folder === "/photos") await restoreGate;
        return originalRead(folder, name);
    });
    const restoring = f.photos.restore();
    await new Promise(setImmediate);
    let releasePicker;
    const pickerGate = new Promise((resolve) => { releasePicker = resolve; });
    t.mock.method(window.drAWDesktop.photoFolder, "selectPhoto", () => pickerGate);
    const linking = f.photos.toggle();
    try {
        releaseRestore();
        await restoring;
        assert.equal(f.document.getCurrentPage().getImages().length, 0, "old restore ran after manual linking started");
        releasePicker({ folderPath: "/other-photos", fileName: "1.png" });
        await linking;
        assert.deepEqual(JSON.parse(f.local.get("draw:photo-link")), {
            folderPath: "/other-photos", fileName: "1.png"
        });
        assert.equal(f.document.getCurrentPage().getImages().length, 1);
    } finally {
        releaseRestore();
        releasePicker(null);
        await Promise.all([restoring, linking]);
    }
});

for (const phase of ["listPhotos", "readPhoto"]) {
    test(`a pending restored folder ${phase} cannot replace a newly selected folder`, async (t) => {
        const f = fixture(t);
        f.local.set("draw:photo-link", JSON.stringify({ folderPath: "/photos", fileName: "1.png" }));
        const original = window.drAWDesktop.photoFolder[phase];
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        t.mock.method(window.drAWDesktop.photoFolder, phase, async (folder, ...args) => {
            if (folder === "/photos") await gate;
            return original(folder, ...args);
        });
        const restoring = f.photos.restore();
        if (phase === "readPhoto") await new Promise(setImmediate);
        try {
            t.mock.method(window.drAWDesktop.photoFolder, "selectPhoto", async () => ({
                folderPath: "/other-photos", fileName: "1.png"
            }));
            await f.photos.toggle();
            release();
            await restoring;
            assert.deepEqual(JSON.parse(f.local.get("draw:photo-link")), {
                folderPath: "/other-photos", fileName: "1.png"
            });
            assert.equal(f.local.get("draw:photo-last-folder"), "/other-photos");
            assert.equal(f.document.getCurrentPage().getImages().length, 1);
            assert.equal(f.photos.isLinkedHolder(f.document.getCurrentPage().getImages()[0]), true);
        } finally {
            release();
            await restoring;
        }
    });
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

for (const phase of ["listPhotos", "readPhoto"]) {
    for (const failure of [false, true]) {
        test(`new drawing preparation cancels a late ${failure ? "failed" : "successful"} ${phase} after opening a record`, async (t) => {
            const f = fixture(t);
            const stored = await storeOtherDrawing(f, true);
            await f.photos.toggle();
            f.draw();
            const previousId = f.auto.getActiveDocument().getId();
            const notice = t.mock.method(f.photos, "showInfo", async () => {});
            const original = window.drAWDesktop.photoFolder[phase];
            let release;
            const gate = new Promise((resolve) => { release = resolve; });
            t.mock.method(window.drAWDesktop.photoFolder, phase, async (...args) => {
                await gate;
                return failure ? null : original(...args);
            });
            const preparing = f.photos.prepareNewDrawing();
            if (phase === "readPhoto") await new Promise(setImmediate);
            try {
                await f.auto.openDrawing(stored);
                assert.equal(f.photos.isLinked(), false, "opening a record left the old photo link active during preparation");
                const opened = f.document.createSnapshot();
                release();
                assert.equal(await preparing, undefined, "obsolete preparation must cancel the new drawing");
                assert.equal(f.document.snapshotsMatch(opened, f.document.createSnapshot()), true);
                assert.equal(f.auto.getActiveDocument().getId(), stored.getId());
                assert.equal(f.auto.isDirty(), false);
                assert.equal(f.history.canUndo(), false);
                assert.equal(f.local.has("draw:photo-link"), false);
                assert.equal(f.local.get("draw:photo-last-folder"), "/photos");
                assert.equal(notice.mock.callCount(), 0, "obsolete preparation showed a misleading error");
                assert.equal(f.records.get(previousId).getCanvasState().getData().strokes.length, 1);
                assert.equal(f.records.get(previousId).getCanvasState().getData().images[0].dataUrl, "data:image/png;base64,1.png");
            } finally {
                release();
                await preparing;
            }
        });
    }
}

for (const mode of ["next photo", "last photo", "unlinked"]) {
    test(`new drawing cannot commit a stale ${mode} preparation after another record opens during save`, async (t) => {
        const f = fixture(t);
        const stored = await storeOtherDrawing(f, true);
        if (mode !== "unlinked") {
            await f.photos.toggle();
            if (mode === "last photo") {
                await f.step(1);
                await f.step(1);
            }
        }
        f.draw();
        const previousId = f.auto.getActiveDocument().getId();
        const prepared = await f.photos.prepareNewDrawing();
        assert.equal(prepared === null, mode !== "next photo");
        const write = f.storage.save.bind(f.storage);
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        let entered;
        const savingStarted = new Promise((resolve) => { entered = resolve; });
        t.mock.method(f.storage, "save", async (record) => {
            entered();
            await gate;
            await write(record);
        });
        const opening = f.auto.openDrawing(stored);
        await savingStarted;
        const savingNew = f.auto.newDrawing();
        try {
            assert.equal(f.auto.getActiveDocument().getId(), previousId);
            release();
            await opening;
            const opened = f.document.createSnapshot();
            await savingNew;
            assert.equal(f.photos.beginPreparedNewDrawing(), false, "stale preparation permitted clearing the opened drawing");
            assert.equal(f.document.snapshotsMatch(opened, f.document.createSnapshot()), true);
            assert.equal(f.auto.getActiveDocument().getId(), stored.getId());
            assert.equal(f.auto.isDirty(), false);
            assert.equal(f.history.canUndo(), false);
            assert.equal(f.photos.isLinked(), false);
            assert.equal(f.local.has("draw:photo-link"), false);
            assert.equal(f.records.get(previousId).getCanvasState().getData().strokes.length, 1);
            if (mode !== "unlinked") assert.equal(f.local.get("draw:photo-last-folder"), "/photos");
        } finally {
            release();
            await Promise.all([opening, savingNew]);
        }
    });
}

test("undo during successful new drawing preparation preserves the link and permits the transition", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    f.draw();
    const read = window.drAWDesktop.photoFolder.readPhoto;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    t.mock.method(window.drAWDesktop.photoFolder, "readPhoto", async (...args) => {
        await gate;
        return read(...args);
    });
    const preparing = f.photos.prepareNewDrawing();
    await new Promise(setImmediate);
    try {
        assert.equal(f.history.undo(), true);
        assert.equal(f.photos.isLinkedHolder(f.document.getCurrentPage().getImages()[0]), true);
        release();
        const prepared = await preparing;
        assert.equal(prepared.fileName, "2.png");
        await f.auto.newDrawing();
        assert.equal(f.photos.beginPreparedNewDrawing(), true);
        f.document.clearCurrentPage();
        f.history.reset();
        f.auto.resetActiveDocument();
        f.photos.placePreparedPhoto(prepared);
        assert.equal(f.photos.isLinked(), true);
        assert.equal(f.linkedName(), "2.png");
        assert.equal(f.history.canUndo(), false);
        await f.auto.saveIfNeeded();
        assert.equal(f.storedPhoto(), "data:image/png;base64,2.png");
    } finally {
        release();
        await preparing;
    }
});

test("opening a record while the missing-photo notice is pending cancels the new drawing", async (t) => {
    const f = fixture(t);
    const stored = await storeOtherDrawing(f);
    await f.photos.toggle();
    t.mock.method(window.drAWDesktop.photoFolder, "listPhotos", async () => []);
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    t.mock.method(f.photos, "showInfo", () => gate);
    const preparing = f.photos.prepareNewDrawing();
    await new Promise(setImmediate);
    try {
        assert.equal(f.photos.isLinked(), false);
        await f.auto.openDrawing(stored);
        const opened = f.document.createSnapshot();
        release();
        assert.equal(await preparing, undefined);
        assert.equal(f.photos.beginPreparedNewDrawing(), false);
        assert.equal(f.document.snapshotsMatch(opened, f.document.createSnapshot()), true);
        assert.equal(f.auto.getActiveDocument().getId(), stored.getId());
        assert.equal(f.auto.isDirty(), false);
    } finally {
        release();
        await preparing;
    }
});

test("new drawing saves its prepared photo after resetting the active record", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    const nextPhoto = await f.photos.prepareNewDrawing();
    await f.auto.newDrawing();
    assert.equal(f.photos.beginPreparedNewDrawing(), true);
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
    assert.equal(f.photos.beginPreparedNewDrawing(), true);
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

test("reconnecting after manual unlink passes the last folder to the picker", async (t) => {
    const f = fixture(t);
    const picker = t.mock.method(window.drAWDesktop.photoFolder, "selectPhoto");
    await f.photos.toggle();
    await f.photos.toggle();
    assert.equal(f.photos.isLinked(), false);
    await f.photos.toggle();
    assert.equal(picker.mock.calls[1].arguments[0], "/photos");
});

for (const failingMethods of [["getItem"], ["setItem"], ["getItem", "setItem"]]) {
    test(`reconnecting remembers this session's folder when ${failingMethods.join(" and ")} fails`, async (t) => {
        const f = fixture(t);
        f.local.set("draw:photo-last-folder", "/old-folder");
        for (const method of failingMethods) {
            t.mock.method(window.localStorage, method, () => { throw new Error("Storage unavailable"); });
        }
        const picker = t.mock.method(window.drAWDesktop.photoFolder, "selectPhoto");
        await f.photos.toggle();
        await f.photos.toggle();
        await f.photos.toggle();
        assert.equal(picker.mock.calls[1].arguments[0], "/photos");
        assert.equal(f.photos.isLinked(), true);
    });
}

test("a newly selected folder wins over an older stored folder when writing fails", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    await f.photos.toggle();
    t.mock.method(window.localStorage, "setItem", () => { throw new Error("Storage full"); });
    const picker = t.mock.method(window.drAWDesktop.photoFolder, "selectPhoto", async () => ({
        folderPath: "/Dersler/Çizim Fotoğrafları", fileName: "1.png"
    }));
    await f.photos.toggle();
    await f.photos.toggle();
    await f.photos.toggle();
    assert.equal(picker.mock.calls[1].arguments[0], "/Dersler/Çizim Fotoğrafları");
    assert.equal(f.local.get("draw:photo-last-folder"), "/photos", "test must retain the older stored path");
});

test("a fresh photo manager reads the folder persisted by a previous instance", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    await f.photos.toggle();
    const next = new LinkedPhotoManager(f.document, { render() {} }, () => f.auto.markDirty());
    const picker = t.mock.method(window.drAWDesktop.photoFolder, "selectPhoto");
    await next.toggle();
    assert.equal(picker.mock.calls[0].arguments[0], "/photos");
});

test("automatic unlink and a cancelled picker keep the remembered folder", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    f.document.clearCurrentPage();
    f.history.reset();
    assert.equal(f.photos.isLinked(), false);
    const picker = t.mock.method(window.drAWDesktop.photoFolder, "selectPhoto", async () => null);
    await f.photos.toggle();
    await f.photos.toggle();
    assert.deepEqual(picker.mock.calls.map((call) => call.arguments[0]), ["/photos", "/photos"]);
    assert.equal(f.photos.isLinked(), false);
});

for (const failure of ["unavailable", "rejected"]) {
    for (const action of ["new drawing", "next photo"]) {
        test(`${action} preserves the folder link and can retry when listing is ${failure}`, async (t) => {
            const f = fixture(t);
            t.mock.method(console, "error", () => {});
            const notice = t.mock.method(f.photos, "showInfo", async () => {});
            await f.photos.toggle();
            const image = f.document.getCurrentPage().getImages()[0];
            const storedLink = f.local.get("draw:photo-link");
            const bridge = window.drAWDesktop.photoFolder;
            const listing = t.mock.method(bridge, "listPhotos", async () => {
                if (failure === "rejected") throw new Error("IPC unavailable");
                return null;
            });

            if (action === "new drawing") {
                assert.equal(await f.photos.prepareNewDrawing(), undefined, "failed preparation must cancel the transition");
            } else {
                await f.step(1);
            }
            assert.equal(f.photos.isLinked(), true);
            assert.equal(f.local.get("draw:photo-link"), storedLink);
            assert.equal(f.local.get("draw:photo-last-folder"), "/photos");
            assert.equal(f.document.getCurrentPage().getImages()[0], image);
            assert.equal(f.photos.canStepPhoto(1), true, "retry arrow was disabled");
            assert.equal(notice.mock.callCount(), 1);

            listing.mock.restore();
            if (action === "new drawing") {
                const prepared = await f.photos.prepareNewDrawing();
                assert.equal(prepared.fileName, "2.png");
                f.photos.cancelPreparedNewDrawing();
            } else {
                await f.step(1);
                assert.equal(f.linkedName(), "2.png");
            }
            assert.equal(f.photos.isLinked(), true);
        });
    }
}

test("failed photo reading cancels preparation and restores holder validation", async (t) => {
    const f = fixture(t);
    t.mock.method(f.photos, "showInfo", async () => {});
    await f.photos.toggle();
    t.mock.method(window.drAWDesktop.photoFolder, "readPhoto", async () => null);
    assert.equal(await f.photos.prepareNewDrawing(), undefined);
    assert.equal(f.photos.isLinked(), true);
    assert.equal(f.linkedName(), "1.png");
    f.document.clearCurrentPage();
    f.history.reset();
    assert.equal(f.photos.isLinked(), false, "failed preparation left validation suspended");
});

test("failed directory listing restores holder validation", async (t) => {
    const f = fixture(t);
    t.mock.method(f.photos, "showInfo", async () => {});
    await f.photos.toggle();
    t.mock.method(window.drAWDesktop.photoFolder, "listPhotos", async () => null);
    assert.equal(await f.photos.prepareNewDrawing(), undefined);
    assert.equal(f.photos.isLinked(), true);
    f.document.clearCurrentPage();
    f.history.reset();
    assert.equal(f.photos.isLinked(), false, "failed preparation left validation suspended");
});

for (const method of ["listPhotos", "readPhoto"]) {
    test(`restore preserves the stored link after ${method} fails and can retry`, async (t) => {
        const f = fixture(t);
        const stored = JSON.stringify({ folderPath: "/photos", fileName: "1.png" });
        f.local.set("draw:photo-link", stored);
        const access = t.mock.method(window.drAWDesktop.photoFolder, method, async () => null);
        await f.photos.restore();
        assert.equal(f.local.get("draw:photo-link"), stored);
        assert.equal(f.document.getCurrentPage().getImages().length, 0);
        access.mock.restore();
        await f.photos.restore();
        assert.equal(f.photos.isLinked(), true);
        assert.equal(f.linkedName(), "2.png");
    });
}

test("successful empty listing still detects an actually missing linked photo", async (t) => {
    const f = fixture(t);
    t.mock.method(f.photos, "showInfo", async () => {});
    await f.photos.toggle();
    t.mock.method(window.drAWDesktop.photoFolder, "listPhotos", async () => []);
    assert.equal(await f.photos.prepareNewDrawing(), null);
    assert.equal(f.photos.isLinked(), false);
    assert.equal(f.local.get("draw:photo-last-folder"), "/photos");
});

test("undo and redo of strokes keep the linked photo and allow further navigation", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    const original = f.document.getCurrentPage().getImages()[0];
    f.draw();
    for (let repeat = 0; repeat < 2; repeat++) {
        assert.equal(f.history.undo(), true);
        const restored = f.document.getCurrentPage().getImages()[0];
        assert.notEqual(restored, original, "history must still copy image geometry");
        assert.equal(f.photos.isLinked(), true);
        assert.equal(f.photos.isLinkedHolder(restored), true);
        assert.equal(f.photos.isLinkedHolder(original), false, "an obsolete instance is not on the page");
        assert.equal(f.document.getCurrentPage().getStrokes().length, 0);
        assert.equal(f.history.redo(), true);
        assert.equal(f.photos.isLinked(), true);
        assert.equal(f.photos.isLinkedHolder(f.document.getCurrentPage().getImages()[0]), true);
        assert.equal(f.document.getCurrentPage().getStrokes().length, 1);
    }
    await f.step(1);
    assert.equal(f.linkedName(), "2.png");
    assert.equal(f.document.getCurrentPage().getImages().length, 1);
    assert.equal(f.document.getCurrentPage().getImages()[0].getDataUrl(), "data:image/png;base64,2.png");
    await f.auto.saveIfNeeded();
    assert.equal(f.storedPhoto(), "data:image/png;base64,2.png");
});

test("undo during failed new drawing preparation keeps the current photo and folder link", async (t) => {
    const f = fixture(t);
    t.mock.method(f.photos, "showInfo", async () => {});
    await f.photos.toggle();
    f.draw();
    await f.step(1);
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    t.mock.method(window.drAWDesktop.photoFolder, "listPhotos", () => gate);
    const preparing = f.photos.prepareNewDrawing();
    try {
        assert.equal(f.history.undo(), true);
        const current = f.document.getCurrentPage().getImages()[0];
        assert.equal(current.getDataUrl(), "data:image/png;base64,2.png");
        assert.equal(f.photos.isLinkedHolder(current), true);
    } finally {
        release(null);
        assert.equal(await preparing, undefined);
    }
    f.draw();
    assert.equal(f.photos.isLinked(), true);
    assert.equal(f.linkedName(), "2.png");
    await f.auto.saveIfNeeded();
    assert.equal(f.storedPhoto(), "data:image/png;base64,2.png");
});

test("linked photo geometry remains undoable and navigation uses the restored geometry", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    const image = f.document.getCurrentPage().getImages()[0];
    const geometry = () => {
        const current = f.document.getCurrentPage().getImages()[0];
        return [current.getX(), current.getY(), current.getWidth(), current.getHeight()];
    };
    const initial = geometry();
    f.history.begin();
    image.setGeometry(80, 90, 200, 200);
    f.history.commit();
    f.history.undo();
    assert.deepEqual(geometry(), initial);
    assert.equal(f.photos.isLinked(), true);
    f.history.redo();
    assert.deepEqual(geometry(), [80, 90, 200, 200]);
    assert.equal(f.photos.isLinked(), true);
    f.history.undo();
    await f.step(1);
    assert.equal(f.linkedName(), "2.png");
    assert.deepEqual(geometry(), initial);
    assert.equal(f.document.getCurrentPage().getImages().length, 1);
});

test("photo navigation stays outside undo history and the visible photo matches its file name", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    f.history.begin();
    f.document.getCurrentPage().getImages()[0].setGeometry(80, 90, 200, 200);
    f.history.commit();
    f.draw();
    t.mock.method(window.drAWDesktop.photoFolder, "readPhoto", async (_folder, name) => ({
        dataUrl: `data:image/png;base64,${name}`, width: 200, height: 100
    }));
    await f.step(1);
    for (const operation of ["undo", "redo", "undo"]) {
        assert.equal(f.history[operation](), true);
        assert.equal(f.photos.isLinked(), true);
        assert.equal(f.linkedName(), "2.png");
        const images = f.document.getCurrentPage().getImages();
        assert.equal(images.length, 1);
        assert.equal(images[0].getDataUrl(), "data:image/png;base64,2.png");
        assert.equal(images[0].getWidth() / images[0].getHeight(), 2);
        assert.equal(f.photos.isLinkedHolder(images[0]), true);
    }
    assert.equal(f.history.undo(), true, "the photo's earlier geometry must also remain undoable");
    const restored = f.document.getCurrentPage().getImages()[0];
    assert.deepEqual([restored.getX(), restored.getY(), restored.getWidth(), restored.getHeight()], [16, 16, 800, 400]);
    assert.equal(restored.getDataUrl(), "data:image/png;base64,2.png");
    assert.equal(f.photos.isLinked(), true);
    await f.auto.saveIfNeeded();
    assert.equal(f.storedPhoto(), "data:image/png;base64,2.png");
    assert.equal((await f.photos.prepareNewDrawing()).fileName, "3.png");
    f.photos.cancelPreparedNewDrawing();
});

test("undoing a stroke drawn before linking does not remove the newly linked photo", async (t) => {
    const f = fixture(t);
    f.draw();
    await f.photos.toggle();
    for (const operation of ["undo", "redo", "undo"]) {
        assert.equal(f.history[operation](), true);
        assert.equal(f.photos.isLinked(), true);
        assert.equal(f.document.getCurrentPage().getImages().length, 1);
        assert.equal(f.photos.isLinkedHolder(f.document.getCurrentPage().getImages()[0]), true);
    }
    assert.equal(f.document.getCurrentPage().getStrokes().length, 0);
});

test("history identifies the linked photo separately from an identical ordinary image", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    const original = f.document.getCurrentPage().getImages()[0];
    f.document.getCurrentPage().addImage(new DocumentImage(
        original.getDataUrl(), original.getX(), original.getY(), original.getWidth(), original.getHeight()
    ));
    f.draw();
    f.history.undo();
    const images = f.document.getCurrentPage().getImages();
    assert.equal(images.length, 2);
    assert.equal(f.photos.isLinkedHolder(images[0]), true);
    assert.equal(f.photos.isLinkedHolder(images[1]), false);
});

test("deleting the linked photo disconnects even with an identical image; undo does not reconnect", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    const original = f.document.getCurrentPage().getImages()[0];
    f.document.getCurrentPage().addImage(new DocumentImage(
        original.getDataUrl(), original.getX(), original.getY(), original.getWidth(), original.getHeight()
    ));
    f.history.begin();
    f.document.getCurrentPage().removeImage(original);
    f.history.commit();
    assert.equal(f.photos.isLinked(), false);
    f.history.undo();
    assert.equal(f.document.getCurrentPage().getImages().length, 2);
    assert.equal(f.photos.isLinked(), false);
    assert.equal(f.document.getCurrentPage().getImages().some((image) => f.photos.isLinkedHolder(image)), false);
    f.history.redo();
    assert.equal(f.document.getCurrentPage().getImages().length, 1);
    assert.equal(f.photos.isLinked(), false);
});

test("undo cannot reactivate a manually disconnected photo link", async (t) => {
    const f = fixture(t);
    await f.photos.toggle();
    f.draw();
    await f.photos.toggle();
    f.history.undo();
    assert.equal(f.photos.isLinked(), false);
    f.history.redo();
    assert.equal(f.photos.isLinked(), false);
});
