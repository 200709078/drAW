import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig({
    base: "./",
    // Hakkında penceresindeki sürüm; tek kaynak package.json.
    define: { __APP_VERSION__: JSON.stringify(version) }
});
