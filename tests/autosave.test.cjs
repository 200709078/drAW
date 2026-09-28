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
const { Point } = require("../src/document/Point.ts");
const { Stroke } = require("../src/document/Stroke.ts");
const { HistoryManager } = require("../src/core/HistoryManager.ts");
const { AutoSaveManager } = require("../src/autosave/AutoSaveManager.ts");
const { DrawingRepository } = require("../src/storage/DrawingRepository.ts");
const { ThumbnailStorageDecorator } = require("../src/storage/ThumbnailStorageDecorator.ts");

if (previousTsLoader === undefined) {
    delete require.extensions[".ts"];
} else {
    require.extensions[".ts"] = previousTsLoader;
}

function deferred() {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
}

function pause() {
    const entered = deferred();
    const released = deferred();
    return {
        started: entered.promise,
        release: released.resolve,
        async wait() {
            entered.resolve();
            await released.promise;
        }
    };
}

class MemoryStorage {
    records = new Map();
    writes = [];
    gates = [];
    listCalls = 0;
    concurrentWrites = 0;
    maxConcurrentWrites = 0;

    pauseNextSave() {
        const gate = pause();
        this.gates.push(gate);
        return gate;
    }

    async save(document) {
        this.writes.push(document);
        this.concurrentWrites++;
        this.maxConcurrentWrites = Math.max(this.maxConcurrentWrites, this.concurrentWrites);
        try {
            const gate = this.gates.shift();
            if (gate) await gate.wait();
            this.records.set(document.getId(), document);
        } finally {
            this.concurrentWrites--;
        }
    }

    async load(id) { return this.records.get(id) ?? null; }
    async delete(id) { this.records.delete(id); }
    async rename(id, name) { this.records.set(id, this.records.get(id).withDisplayName(name)); }
    async list() {
        this.listCalls++;
        return [...this.records.values()];
    }
}

function fixture(t, decorate = (storage) => storage) {
    const storage = new MemoryStorage();
    const document = new Document();
    const history = new HistoryManager(document);
    const repository = new DrawingRepository(decorate(storage));
    const auto = new AutoSaveManager(repository, document, history);
    // Tests drive saves explicitly; no real interval should outlive a failed assertion.
    t.after(() => auto.stopAutoSave());
    return {
        storage, document, history, auto,
        draw(x) {
            history.begin();
            const stroke = new Stroke();
            stroke.addPoint(new Point(x, 100, 1));
            document.getCurrentPage().addStroke(stroke);
            history.commit();
        },
        savedXs() {
            const stored = storage.records.get(auto.getActiveDocument().getId());
            return strokeXs(stored);
        }
    };
}

function strokeXs(stored) {
    return stored.getCanvasState().getData().strokes.map((stroke) => stroke.points[0][0]);
}

async function waitForFollowUp(gate, saving) {
    await Promise.race([
        gate.started,
        saving.then(() => { assert.fail("Save finished before persisting the newer edits"); })
    ]);
}

for (const alreadySaved of [false, true]) {
    test(`edits during ${alreadySaved ? "an existing" : "a new"} drawing save are persisted`, { timeout: 2000 }, async (t) => {
        const f = fixture(t);
        f.draw(10);
        if (alreadySaved) {
            await f.auto.saveIfNeeded();
            f.draw(20);
        }
        const id = f.auto.getActiveDocument().getId();
        const gate = f.storage.pauseNextSave();
        const saving = f.auto.saveIfNeeded();
        await gate.started;
        f.draw(30);
        assert.equal(f.auto.saveIfNeeded(), saving, "concurrent callers share the save queue");
        gate.release();
        await saving;

        assert.deepEqual(f.savedXs(), alreadySaved ? [10, 20, 30] : [10, 30]);
        assert.equal(f.auto.isDirty(), false);
        assert.equal(f.auto.getActiveDocument().getId(), id);
        assert.equal(f.storage.records.size, 1);
        assert.equal(f.storage.listCalls, 1, "follow-up saves update the same record");
        assert.equal(f.storage.maxConcurrentWrites, 1);
        assert.equal(f.storage.writes.length, alreadySaved ? 3 : 2);
    });
}

test("edits during initial record listing are persisted", { timeout: 2000 }, async (t) => {
    const f = fixture(t);
    const gate = pause();
    t.mock.method(f.storage, "list", async () => {
        await gate.wait();
        return [];
    });
    f.draw(10);
    const saving = f.auto.saveIfNeeded();
    await gate.started;
    f.draw(20);
    gate.release();
    await saving;
    assert.deepEqual(f.savedXs(), [10, 20]);
    assert.equal(f.auto.isDirty(), false);
});

test("edits during thumbnail generation are persisted", { timeout: 2000 }, async (t) => {
    const gate = pause();
    let generations = 0;
    const f = fixture(t, (storage) => new ThumbnailStorageDecorator(storage, {
        async generate() {
            if (++generations === 1) await gate.wait();
            return { dataUrl: "data:image/png;base64,thumbnail" };
        }
    }));
    f.draw(10);
    const saving = f.auto.saveIfNeeded();
    await gate.started;
    f.draw(20);
    gate.release();
    await saving;
    assert.deepEqual(f.savedXs(), [10, 20]);
    assert.equal(generations, 2);
    assert.equal(f.auto.isDirty(), false);
});

test("shutdown waits for edits made during successive writes", { timeout: 2000 }, async (t) => {
    const f = fixture(t);
    f.draw(10);
    const first = f.storage.pauseNextSave();
    const saving = f.auto.saveIfNeeded();
    await first.started;
    f.draw(20);
    const second = f.storage.pauseNextSave();
    let closed = false;
    const closing = f.auto.shutdown().then(() => { closed = true; });
    first.release();
    await waitForFollowUp(second, saving);
    assert.equal(closed, false);
    assert.equal(f.auto.isDirty(), true, "newer edits stay dirty until their write completes");
    f.draw(30);
    const third = f.storage.pauseNextSave();
    second.release();
    await waitForFollowUp(third, saving);
    assert.equal(closed, false);
    third.release();
    await closing;

    assert.deepEqual(f.savedXs(), [10, 20, 30]);
    assert.equal(f.auto.isDirty(), false);
    assert.equal(f.storage.writes.length, 3);
    assert.equal(f.storage.maxConcurrentWrites, 1);
});

test("starting a new drawing waits for the latest changes", { timeout: 2000 }, async (t) => {
    const f = fixture(t);
    f.draw(10);
    const gate = f.storage.pauseNextSave();
    const saving = f.auto.saveIfNeeded();
    await gate.started;
    f.draw(20);
    const starting = f.auto.newDrawing();
    gate.release();
    await starting;
    assert.deepEqual(f.savedXs(), [10, 20]);
    await saving;
});

test("opening another drawing preserves edits made during the previous save", { timeout: 2000 }, async (t) => {
    const f = fixture(t);
    f.draw(10);
    await f.auto.saveIfNeeded();
    const other = f.auto.getActiveDocument();
    f.document.clearCurrentPage();
    f.history.reset();
    f.auto.resetActiveDocument();
    f.draw(20);
    const currentId = f.auto.getActiveDocument().getId();
    const gate = f.storage.pauseNextSave();
    const saving = f.auto.saveIfNeeded();
    await gate.started;
    f.draw(30);
    const opening = f.auto.openDrawing(other);
    gate.release();
    await opening;

    assert.deepEqual(strokeXs(f.storage.records.get(currentId)), [20, 30]);
    assert.equal(f.auto.getActiveDocument().getId(), other.getId());
    assert.equal(f.document.getCurrentPage().getStrokes()[0].getPoints()[0].getX(), 10);
    assert.equal(f.auto.isDirty(), false);
    await saving;
});

test("undo during the first save persists the now empty drawing", { timeout: 2000 }, async (t) => {
    const f = fixture(t);
    f.draw(10);
    const gate = f.storage.pauseNextSave();
    const saving = f.auto.saveIfNeeded();
    await gate.started;
    assert.equal(f.history.undo(), true);
    gate.release();
    await saving;
    assert.deepEqual(f.savedXs(), []);
    assert.equal(f.storage.writes.length, 2);
    assert.equal(f.auto.isDirty(), false);
});

test("a failed follow-up stays dirty and can be retried without a retry loop", { timeout: 2000 }, async (t) => {
    const f = fixture(t);
    t.mock.method(console, "error", () => {});
    const write = f.storage.save.bind(f.storage);
    let attempts = 0;
    t.mock.method(f.storage, "save", async (document) => {
        if (++attempts === 2) throw new Error("Simulated storage failure");
        await write(document);
    });
    f.draw(10);
    const gate = f.storage.pauseNextSave();
    const saving = f.auto.saveIfNeeded();
    await gate.started;
    f.draw(20);
    gate.release();
    await assert.rejects(saving, /Simulated storage failure/);
    assert.equal(attempts, 2);
    assert.equal(f.auto.isDirty(), true);
    assert.deepEqual(f.savedXs(), [10]);

    await f.auto.saveIfNeeded();
    assert.equal(attempts, 3);
    assert.deepEqual(f.savedXs(), [10, 20]);
    assert.equal(f.auto.isDirty(), false);
});

test("an untouched or empty new drawing does not start a save loop", { timeout: 2000 }, async (t) => {
    const f = fixture(t);
    await f.auto.saveIfNeeded();
    f.history.reset();
    await f.auto.saveIfNeeded();
    assert.equal(f.storage.writes.length, 0);
    assert.equal(f.storage.listCalls, 0);
});

test("an unchanged drawing needs only one write", { timeout: 2000 }, async (t) => {
    const f = fixture(t);
    f.draw(10);
    await f.auto.saveIfNeeded();
    await f.auto.saveIfNeeded();
    assert.deepEqual(f.savedXs(), [10]);
    assert.equal(f.storage.writes.length, 1);
    assert.equal(f.auto.isDirty(), false);
});

for (const action of ["saveIfNeeded", "newDrawing", "shutdown", "openDrawing"]) {
    test(`${action} rejects a failed save and preserves the current drawing and undo`, async (t) => {
        const f = fixture(t);
        t.mock.method(console, "error", () => {});
        f.draw(10);
        await f.auto.saveIfNeeded();
        const other = f.auto.getActiveDocument();
        f.document.clearCurrentPage();
        f.history.reset();
        f.auto.resetActiveDocument();
        f.draw(20);
        const activeId = f.auto.getActiveDocument().getId();
        const failure = new Error("Disk full");
        const mockedSave = t.mock.method(f.storage, "save", async () => { throw failure; });

        await assert.rejects(f.auto[action](other), (error) => error === failure);
        assert.equal(f.auto.getActiveDocument().getId(), activeId);
        assert.equal(f.document.getCurrentPage().getStrokes()[0].getPoints()[0].getX(), 20);
        assert.equal(f.history.canUndo(), true);
        assert.equal(f.auto.isDirty(), true);
        if (action === "shutdown") {
            assert.notEqual(f.auto.autosaveTimer, null, "a cancelled shutdown must keep autosaving");
        }

        mockedSave.mock.restore();
        await f.auto.saveIfNeeded();
        assert.deepEqual(f.savedXs(), [20]);
        assert.equal(f.auto.isDirty(), false);
    });
}

test("the autosave timer handles a failed write and retries on the next tick", async (t) => {
    let tick;
    t.mock.method(global, "setInterval", (callback) => { tick = callback; return 1; });
    t.mock.method(global, "clearInterval", () => {});
    t.mock.method(console, "error", () => {});
    const f = fixture(t);
    f.draw(10);
    const mockedSave = t.mock.method(f.storage, "save", async () => { throw new Error("Disk full"); });
    tick();
    await new Promise(setImmediate);
    assert.equal(f.auto.isDirty(), true);

    mockedSave.mock.restore();
    tick();
    await new Promise(setImmediate);
    assert.deepEqual(f.savedXs(), [10]);
    assert.equal(f.auto.isDirty(), false);
});
