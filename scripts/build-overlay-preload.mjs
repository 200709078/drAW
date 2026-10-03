import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";

// Electron .cjs dosyasını yükler; düzenlemeler .ts kaynağından üretilir.
const source = new URL("../electron/overlay-preload.ts", import.meta.url);
const output = new URL("../electron/overlay-preload.cjs", import.meta.url);
const { outputText } = ts.transpileModule(await readFile(source, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
});
await writeFile(output, "// Generated from overlay-preload.ts by scripts/build-overlay-preload.mjs.\n" + outputText);
