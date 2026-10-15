const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const ts = require("typescript");
const previous = require.extensions[".ts"];
require.extensions[".ts"] = (module, filename) => {
    module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText, filename);
};
const { DrawingRepository } = require("../src/storage/DrawingRepository.ts");
const { DrawingDocument } = require("../src/storage/DrawingDocument.ts");
if (previous) require.extensions[".ts"] = previous;
else delete require.extensions[".ts"];

function record(index, updated = index) {
    return DrawingDocument.fromJSON({ version: 1, id: `drawing-${index}`, displayName: `Drawing ${index}`,
        createdAt: new Date(index * 1000).toISOString(), updatedAt: new Date(updated * 1000).toISOString(),
        thumbnail: null, canvasState: { version: 1, data: {} }, metadata: {} });
}
function fixture(count) {
    const records = new Map(Array.from({ length: count }, (_, i) => [record(i).getId(), record(i)]));
    const deleted = [];
    const storage = {
        async list() { return [...records.values()]; },
        async save(document) { records.set(document.getId(), document); },
        async delete(id) { deleted.push(id); records.delete(id); }
    };
    return { records, deleted, storage, repository: new DrawingRepository(storage) };
}
for (const count of [0, 29, 30, 50]) {
    test(`new save retains at most 30 newest records from ${count} existing records`, async () => {
        const f = fixture(count);
        assert.equal(f.repository.getLimiter().getMaxRecords(), 30);
        await f.repository.saveNewDocument(record(100));
        assert.equal(f.records.size, Math.min(count + 1, 30));
        assert(f.records.has("drawing-100"));
        const expected = Array.from({ length: Math.max(0, count - 29) }, (_, i) => `drawing-${i}`);
        assert.deepEqual(f.deleted, expected);
    });
}
test("recently updated older drawing is retained", async () => {
    const f = fixture(30);
    f.records.set("drawing-0", record(0, 99));
    await f.repository.saveNewDocument(record(100));
    assert.deepEqual(f.deleted, ["drawing-1"]);
    assert(f.records.has("drawing-0"));
});
test("failed new save never deletes existing records", async () => {
    const f = fixture(50);
    f.storage.save = async () => { throw new Error("disk full"); };
    await assert.rejects(f.repository.saveNewDocument(record(100)), /disk full/);
    assert.equal(f.records.size, 50);
    assert.deepEqual(f.deleted, []);
});
test("retry after eviction failure does not count the incoming record twice", async () => {
    const f = fixture(50);
    const remove = f.storage.delete;
    f.storage.delete = async () => { throw new Error("temporary failure"); };
    await assert.rejects(f.repository.saveNewDocument(record(100)), /temporary failure/);
    assert(f.records.has("drawing-100"));
    f.storage.delete = remove;
    await f.repository.saveNewDocument(record(100));
    assert.equal(f.records.size, 30);
    assert(f.records.has("drawing-21"));
    assert(f.records.has("drawing-100"));
});
