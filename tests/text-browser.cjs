const assert = require("node:assert/strict");
const { browser } = require("./helpers/chromium.cjs");

async function main() {
    const b = await browser();
    const base = process.env.DRAW_TEST_URL || "http://127.0.0.1:5173";
    try {
        for (const [query, expected] of [
            ["", false], ["?tahta=1", true], ["?tahta=1&platform=win32", false],
            ["?tahta=1&platform=web", false]
        ]) {
            await b.goto(`${base}/tests/text-ui.html${query}`);
            await b.until("window.__textResult !== undefined");
            const result = await b.evaluate("window.__textResult");
            assert.deepEqual(result.failures, [], `${query}: ${JSON.stringify(result.failures)}`);
            assert.equal(result.expectsKeyboard, expected);
            console.log(`PASS: ${query || "PC"}: ${result.passed} text/keyboard checks`);
        }
    } finally { await b.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
