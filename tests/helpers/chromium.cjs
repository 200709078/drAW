const { spawn } = require("node:child_process");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");

async function browser() {
    const directory = await mkdtemp(path.join(tmpdir(), "draw-browser-"));
    const child = spawn(process.env.CHROMIUM || "chromium", [
        "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
        "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--window-size=2000,1200",
        `--user-data-dir=${directory}`, "--remote-debugging-pipe", "about:blank"
    ], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
    let sequence = 0;
    let buffered = "";
    let sessionId;
    const pending = new Map();
    const exited = new Promise((resolve) => child.once("exit", resolve));
    const fail = (error) => {
        for (const item of pending.values()) { clearTimeout(item.timer); item.reject(error); }
        pending.clear();
    };
    child.on("error", fail);
    child.on("exit", () => fail(new Error("Chromium closed")));
    child.stdio[3].on("error", fail);
    child.stdio[4].setEncoding("utf8");
    child.stdio[4].on("data", (chunk) => {
        buffered += chunk;
        let end;
        while ((end = buffered.indexOf("\0")) !== -1) {
            const packet = JSON.parse(buffered.slice(0, end));
            buffered = buffered.slice(end + 1);
            const item = pending.get(packet.id);
            if (!item) continue;
            pending.delete(packet.id);
            clearTimeout(item.timer);
            if (packet.error) item.reject(new Error(JSON.stringify(packet.error)));
            else item.resolve(packet.result);
        }
    });
    function send(method, params = {}, useSession = true) {
        return new Promise((resolve, reject) => {
            const id = ++sequence;
            const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 15000);
            pending.set(id, { resolve, reject, timer });
            child.stdio[3].write(JSON.stringify({ id, method, params, ...(useSession && sessionId ? { sessionId } : {}) }) + "\0");
        });
    }
    async function evaluate(expression) {
        const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
        if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
        return response.result.value;
    }
    async function until(expression) {
        for (let attempt = 0; attempt < 160; attempt++) {
            if (await evaluate(expression)) return;
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        throw new Error(`Browser condition timed out: ${expression}`);
    }
    async function close() {
        child.kill("SIGTERM");
        const force = setTimeout(() => child.kill("SIGKILL"), 3000);
        await exited;
        clearTimeout(force);
        await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
    try {
        const target = await send("Target.createTarget", { url: "about:blank" }, false);
        sessionId = (await send("Target.attachToTarget", { targetId: target.targetId, flatten: true }, false)).sessionId;
        await send("Page.enable");
        await send("Runtime.enable");
        return {
            send, evaluate, until, close,
            async goto(url) {
                await send("Page.navigate", { url });
                await until(`location.href === ${JSON.stringify(url)} && document.readyState === "complete"`);
            }
        };
    } catch (error) { await close(); throw error; }
}

module.exports = { browser };
