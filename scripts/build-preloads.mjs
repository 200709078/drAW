import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";

for (const name of ["preload", "quick-capture/selection"]) {
    const source = new URL(`../electron/${name}.ts`, import.meta.url);
    const output = new URL(`../electron/${name}.cjs`, import.meta.url);
    const { outputText } = ts.transpileModule(await readFile(source, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    });
    await writeFile(output, `// Generated from ${name}.ts by scripts/build-preloads.mjs.\n${outputText}`);
}
