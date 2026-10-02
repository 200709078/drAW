const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const ts = require("typescript");

function photoHandlers(fileSystem, nativeImage = {}) {
    const source = readFileSync(`${__dirname}/../electron/photo-folder.ts`, "utf8")
        .replaceAll("import.meta.url", JSON.stringify(__filename));
    const code = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
    }).outputText;
    const module = { exports: {} };
    const dependencies = {
        "node:module": { createRequire: () => () => ({ nativeImage }) },
        "node:fs": { promises: fileSystem }
    };
    new Function("require", "module", "exports", code)(
        (id) => dependencies[id] ?? require(id), module, module.exports
    );
    const handlers = new Map();
    module.exports.registerPhotoFolderHandlers({ handle: (name, handler) => handlers.set(name, handler) });
    return handlers;
}

function photoListHandler(readdir) {
    const handlers = photoHandlers({ readdir });
    return (folder) => handlers.get("photo:list")({}, folder);
}

for (const code of ["EACCES", "EIO", "ENOENT"]) {
    test(`photo:list reports ${code} as unavailable instead of an empty folder`, async (t) => {
        t.mock.method(console, "error", () => {});
        const list = photoListHandler(async () => { throw Object.assign(new Error(code), { code }); });
        assert.equal(await list("/photos"), null);
    });
}

test("photo:list distinguishes an empty readable folder from a failed listing", async () => {
    const list = photoListHandler(async () => []);
    assert.deepEqual(await list("/photos"), []);
});

test("photo:list resumes listing naturally ordered photos after an access failure", async (t) => {
    t.mock.method(console, "error", () => {});
    let unavailable = true;
    const list = photoListHandler(async () => {
        if (unavailable) throw new Error("Drive unavailable");
        return ["10.png", "2.png", "1.jpg", "notes.txt"].map((name) => ({ name, isFile: () => true }));
    });
    assert.equal(await list("/photos"), null);
    unavailable = false;
    assert.deepEqual(await list("/photos"), ["1.jpg", "2.png", "10.png"]);
});

function photoReadFixture(width, height) {
    const original = Buffer.from("original PNG bytes");
    const jpeg = Buffer.from("resized JPEG bytes");
    let resizeOptions = null;
    const image = {
        isEmpty: () => false,
        getSize: () => ({ width, height }),
        resize(options) {
            resizeOptions = options;
            return {
                isEmpty: () => false,
                getSize: () => ({ width: options.width, height: options.height }),
                toJPEG(quality) {
                    assert.equal(quality, 85);
                    return jpeg;
                }
            };
        }
    };
    const handlers = photoHandlers({ readFile: async () => original }, {
        createFromBuffer(buffer) {
            assert.equal(buffer, original);
            return image;
        }
    });
    return {
        read: () => handlers.get("photo:read")({}, "/photos", "photo.png"),
        original, jpeg, resizeOptions: () => resizeOptions
    };
}

for (const [width, height, expectedWidth, expectedHeight] of [
    [4096, 2048, 1920, 960],
    [2048, 4096, 960, 1920],
    [1921, 1081, 1920, 1080],
    [1, 4096, 1, 1920]
]) {
    test(`photo:read returns a usable JPEG data URL for a resized ${width}x${height} photo`, async () => {
        const f = photoReadFixture(width, height);
        const photo = await f.read();
        assert.equal(typeof photo.dataUrl, "string", "photo content must be a data URL, not binary data");
        assert.ok(photo.dataUrl.startsWith("data:image/jpeg;base64,"));
        assert.deepEqual(Buffer.from(photo.dataUrl.split(",")[1], "base64"), f.jpeg);
        assert.deepEqual([photo.width, photo.height], [expectedWidth, expectedHeight]);
        assert.deepEqual(f.resizeOptions(), { width: expectedWidth, height: expectedHeight, quality: "good" });
        assert.deepEqual(JSON.parse(JSON.stringify(photo)), photo, "saving and reopening must preserve image content");
    });
}

for (const [width, height] of [[640, 480], [1920, 1080]]) {
    test(`photo:read preserves the original ${width}x${height} photo without resizing`, async () => {
        const f = photoReadFixture(width, height);
        assert.deepEqual(await f.read(), {
            dataUrl: `data:image/png;base64,${f.original.toString("base64")}`, width, height
        });
        assert.equal(f.resizeOptions(), null);
    });
}
