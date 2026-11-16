// Google Play mağaza görsellerini üretir (docs/play/): npm run play:gorseller (önce derler).
// Derlenmiş uygulama (dist/) Vite önizleme sunucusunda açılır, sistemdeki Chromium testlerdeki CDP yardımcısıyla
// (tests/helpers/chromium.cjs) sürülür; yeni bir bağımlılık gerekmez. Tahtadaki çizim betiğin kendi çizdiği örnek bir
// derstir (Pisagor teoremi); kullanıcının çizimleri kullanılmaz, tarayıcı her seferinde boş bir profille açılır.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { preview } from "vite";

const root = path.resolve(import.meta.dirname, "../..");
const out = path.join(root, "docs/play");
const shots = path.join(out, "ekran");
mkdirSync(shots, { recursive: true });
const { browser } = createRequire(import.meta.url)("../../tests/helpers/chromium.cjs");

const DEVICES = {
    telefon: { width: 360, height: 720, deviceScaleFactor: 3 },
    tablet7: { width: 600, height: 960, deviceScaleFactor: 2 },
    tablet10: { width: 1280, height: 800, deviceScaleFactor: 2 }
};

const PORT = 4179;
const url = `http://127.0.0.1:${PORT}/`;
const server = await preview({ root, preview: { host: "127.0.0.1", port: PORT, strictPort: true } });
const b = await browser();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Bir düğmeye sayfanın kendi tıklamasıyla basar (☰ menüsüne geçmiş olsa da). */
async function press(selector) {
    const found = await b.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return false; e.click(); return true; })()`);
    if (!found) throw new Error(`Düğme yok: ${selector}`);
    await wait(150);
}

async function key(name, code = 0) {
    for (const type of ["keyDown", "keyUp"]) {
        await b.send("Input.dispatchKeyEvent", { type, key: name, code: name, windowsVirtualKeyCode: code });
    }
    await wait(150);
}

/** Parmakla bir yol çizer (dokunma olayları, telefondaki gibi). */
async function stroke(points) {
    const [first, ...rest] = points;
    await b.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: first[0], y: first[1] }] });
    for (const [x, y] of rest) {
        await b.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    }
    await b.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await wait(120);
}

/** İki nokta arası, ara noktalarla (şekil araçları sürüklemeyi izler). */
function line(from, to, steps = 12) {
    return Array.from({ length: steps + 1 }, (_, i) => [from[0] + (to[0] - from[0]) * i / steps, from[1] + (to[1] - from[1]) * i / steps]);
}

const tool = (title) => press(`button.sidebar__tool[title="${title}"]`);
const color = (title) => press(`button.sidebar__color[title="${title}"]`);
const width = (value) => press(`button.sidebar__width[title="${value}"]`);
const shape = (title) => press(`button.sidebar__shape-option[title="${title}"]`);
const pen = (title) => press(`button.sidebar__pen-option[title="${title}"]`);

async function text(x, y, value) {
    await tool("Metin");
    await stroke([[x, y]]);
    await b.send("Input.insertText", { text: value });
    await key("Escape", 27);
}

async function open(device) {
    const { width: w, height: h, deviceScaleFactor } = DEVICES[device];
    await b.send("Storage.clearDataForOrigin", { origin: url.slice(0, -1), storageTypes: "all" });
    await b.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor, mobile: device !== "tablet10" });
    await b.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await b.goto(url);
    await b.until(`document.querySelector('button.sidebar__tool[title="Metin"]') !== null`);
    await wait(800);
}

async function save(name) {
    const { data } = await b.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(shots, `${name}.png`), Buffer.from(data, "base64"));
}

/** Pisagor teoremi dersi: kareli zemin, dik üçgen, kenar adları, formül ve bir örnek. */
async function lesson(device) {
    const { width: w, height: h } = DEVICES[device];
    const wide = w > h;
    const s = wide ? h * 0.42 : w * 0.52;
    const left = wide ? w * 0.12 : w * 0.16;
    const top = wide ? h * 0.2 : h * 0.16;
    await press('button.sidebar__guideline-option[title="Kareli"]');
    await key("Escape", 27);

    // Yazı boyu kalem kalınlığına bağlı (8 + 4 × kalınlık); büyük ekranda bir boy büyük.
    const big = wide ? "10" : "6";
    const small = wide ? "6" : "4";
    await color("Lacivert");
    await width(big);
    await text(left - 8, top - 50, "Pisagor Teoremi");

    // Dik üçgen: dik açı sol altta. Şekil aracı her çizgiden sonra yeniden seçilir.
    const A = [left, top + s];
    const B = [left + s * 1.3, top + s];
    const C = [left, top + s * 0.3];
    await color("Mavi");
    await width(wide ? "6" : "4");
    for (const [from, to] of [[A, B], [B, C], [C, A]]) {
        await shape("Çizgi");
        await stroke(line(from, to));
    }
    await shape("Dikdörtgen");
    await stroke(line([A[0], A[1] - 22], [A[0] + 22, A[1]], 4));

    await color("Kırmızı");
    await width(small);
    await text((A[0] + B[0]) / 2, A[1] + 22, "a");
    await text(A[0] - 22, (A[1] + C[1]) / 2, "b");
    await text((B[0] + C[0]) / 2 + 16, (B[1] + C[1]) / 2 - 16, "c");

    // Formül, altında fosforlu kalem.
    const fx = wide ? w * 0.6 : left + s * 0.2;
    const fy = wide ? top + s * 0.25 : top + s + h * 0.13;
    const fw = wide ? 290 : 190; // yazının genişliği (yazı noktanın sağına yazılır)
    await color("Sarı");
    await tool("Normal Kalem");
    await pen("Fosforlu Kalem");
    await width("24");
    await stroke(line([fx - 8, fy + 4], [fx + fw, fy + 4], 20));
    await pen("Normal Kalem");
    await color("Siyah");
    await width(big);
    await text(fx, fy, "a² + b² = c²");

    // Örnek: 3-4-5 üçgeni, yanında yeşil onay işareti.
    await color("Mor");
    await width(small);
    const ey = fy + (wide ? 90 : h * 0.09);
    await text(fx, ey, "3² + 4² = 9 + 16 = 5²");
    await color("Yeşil");
    await width("6");
    await tool("Normal Kalem");
    const cx = fx + fw * 0.4;
    const cy = ey + (wide ? 60 : h * 0.08);
    await stroke([[cx, cy], [cx + 8, cy + 10], [cx + 14, cy + 18], [cx + 24, cy + 2], [cx + 34, cy - 14], [cx + 42, cy - 26]]);
    await key("Escape", 27);
}

try {
    for (const device of Object.keys(DEVICES)) {
        await open(device);
        await lesson(device);
        await wait(300);
        await save(`${device}-1-ders`);

        // Renk paleti açık.
        await press("button.sidebar__color-trigger");
        await wait(300);
        await save(`${device}-2-renkler`);
        await key("Escape", 27);
        console.log(`${device}: tamam`);
    }

    // Öne çıkan görsel (1024×500)
    await b.send("Emulation.setDeviceMetricsOverride", { width: 1024, height: 500, deviceScaleFactor: 1, mobile: false });
    await b.goto("about:blank");
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
        body { margin: 0; width: 1024px; height: 500px; display: flex; align-items: center; gap: 48px; padding: 0 64px; box-sizing: border-box;
            background: linear-gradient(135deg, #ffffff 0%, #e8f0fe 100%); font-family: "Noto Sans", Arial, sans-serif; color: #202124; }
        img { width: 220px; height: 220px; flex: none; }
        h1 { margin: 0; font-size: 84px; letter-spacing: -1px; }
        h1 span { color: #1a56db; }
        p { margin: 8px 0 0; font-size: 30px; color: #3c4043; }
        ul { display: flex; gap: 12px; margin: 28px 0 0; padding: 0; list-style: none; }
        li { padding: 8px 16px; border-radius: 999px; background: #ffffff; border: 2px solid #c6dafc; font-size: 20px; font-weight: 600; color: #1a56db; }
    </style></head><body>
        <img src="data:image/png;base64,${readFileSync(path.join(root, "public/img/app-icon.png")).toString("base64")}" alt="">
        <div><h1>dr<span>AW</span></h1><p>Akıllı tahta ve çizim uygulaması</p>
        <ul><li>Kalem</li><li>Şekiller</li><li>Metin</li><li>Kareli zemin</li></ul></div>
    </body></html>`;
    await b.evaluate(`document.open(); document.write(${JSON.stringify(html)}); document.close();`);
    await wait(800);
    const { data } = await b.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(out, "one-cikan-1024x500.png"), Buffer.from(data, "base64"));
    copyFileSync(path.join(root, "public/img/app-icon.png"), path.join(out, "simge-512.png"));
    console.log("öne çıkan görsel ve simge: tamam");
} finally {
    await b.close();
    await new Promise((resolve) => server.httpServer.close(resolve));
}
