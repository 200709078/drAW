// GitHub sürümü için SHA256SUMS.txt ve RELEASE_NOTES.md üretir.
// Kullanım: node scripts/release-assets.mjs <paket-klasörü>
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const directory = process.argv[2];
if (!directory) {
    console.error("Kullanım: node scripts/release-assets.mjs <paket-klasörü>");
    process.exit(1);
}

const { version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const packages = [
    { file: `drAW-${version}-linux-x86_64.AppImage`, label: "AppImage", platform: "Linux x86_64" },
    { file: `drAW-${version}-linux-amd64.deb`, label: "DEB", platform: "Linux amd64" },
    { file: `drAW-${version}-win-x64.exe`, label: "exe", platform: "Windows x64" }
];

const present = new Set(await readdir(directory));
const missing = packages.filter(({ file }) => !present.has(file)).map(({ file }) => file);
if (missing.length > 0) {
    console.error(`Eksik paket: ${missing.join(", ")}`);
    process.exit(1);
}

const sums = [];
const rows = [];
for (const item of packages) {
    const file = path.join(directory, item.file);
    const hash = createHash("sha256").update(await readFile(file)).digest("hex");
    sums.push(`${hash}  ${item.file}`);
    rows.push(`| ${item.label} | ${item.platform} | ${(await stat(file)).size.toLocaleString("tr-TR")} bayt |`);
}
await writeFile(path.join(directory, "SHA256SUMS.txt"), `${sums.join("\n")}\n`);

const date = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
const appImage = packages[0].file;
const notes = `drAW ${version} — Linux ve Windows paketleri. Paketler ${date} tarihinde GitHub Actions ile hazırlandı.

| Paket | Platform / mimari | Dosya boyutu |
| --- | --- | --- |
${rows.join("\n")}

### Sistem gereksinimleri

- **Windows:** Windows 10 veya 11 (64-bit). Kurulum dosyası yaklaşık 100 MB, kurulu uygulama yaklaşık 350 MB'dir; toplamda yaklaşık 450 MB boş disk alanı önerilir.
- **Linux:** 64-bit x86_64; Debian/Ubuntu türevi dağıtım (Pardus ETAP 25 dahil). DEB kurulumu yaklaşık 330 MB, AppImage ise yaklaşık 100 MB yer kaplar.
- **DEB bağımlılıkları:** libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0 (önerilen: libappindicator3-1). Paket yöneticisi bunları otomatik kurar.
- **AppImage:** FUSE 2 gerektirir. Sistemde FUSE 2 yoksa \`./${appImage} --appimage-extract-and-run\` ile çalıştırılabilir.

### Kurulum

- **AppImage:** Dosyayı indirin, \`chmod +x ${appImage}\` ile çalıştırma izni verin ve açın.
- **DEB:** \`sudo apt install ./${packages[1].file}\` komutuyla veya dosyayı çift tıklayıp paket yöneticisiyle kurun.
- **exe:** Dosyayı indirip çalıştırın; yönlendirmeli kurulum açılır. Yönetici yetkisi gerekmez, masaüstü ve başlangıç menüsü kısayolları oluşturulur. Paket dijital imzalı olmadığı için Windows SmartScreen "bilinmeyen yayıncı" uyarısı gösterebilir; **Ek bilgi > Yine de çalıştır** ile devam edin.

### Dosya bütünlüğü

SHA-256 değerleri \`SHA256SUMS.txt\` dosyasındadır.

- **Linux:** \`sha256sum -c SHA256SUMS.txt\`
- **Windows (PowerShell):** \`Get-FileHash .\\${packages[2].file} -Algorithm SHA256\` çıktısını \`SHA256SUMS.txt\` ile karşılaştırın.

**Full Changelog**: https://github.com/200709078/drAW/commits/v${version}
`;
await writeFile(path.join(directory, "RELEASE_NOTES.md"), notes);
console.log(`drAW ${version}: ${packages.length} paket, SHA256SUMS.txt ve RELEASE_NOTES.md hazır.`);
