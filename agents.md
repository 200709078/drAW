# agents.md — drAW geliştirici notları

## Windows kurulum paketi (.exe)

- `release/` klasöründe varsayılan olarak sadece Linux çıktıları vardır (`.deb`, `.AppImage`).
- Windows `.exe` (NSIS) üretmek için **bir Windows makinede** çalıştır:
  ```bash
  npm run dist
  ```
- Çıktı: `release/drAW-<sürüm>-win-x64.exe` (yönlendirmeli kurulum, masaüstü kısayolu oluşturur).
- Linux'tan Windows hedefi build etmeye çalışma (wine gerekir, sağlıksız olur).
- Yapılandırma: `package.json` -> `build.win` + `build.nsis`.

## Platform TODO (ertelenen — tahta + ortak düzeltmeler yapıldı)

Tahta (`board-mode` CSS, tahta kalem seti, metin sınırı, coalesced, pointerId kilitleri, 400px thumbnail) ve ortak düzeltmeler tamam. Aşağıdakiler bekliyor:

- [x] YAPILDI — Küçük dokunma hedeflerini büyüt: 44px seçim-sil + kart aksiyonları, 44px renk/genişlik paletleri (+dar ekranda sarma), 40px kenar okları (`src/style.css`)
- [x] YAPILDI — Yatay modda sol panel taşması: `max-height` + kaydırma (`src/style.css`)
- [ ] Pinch-zoom / tuval kaydırma aracı (mobilde detay çalışması için; yeni araç + renderer ölçeği — büyük iş)
- [x] YAPILDI — Pinch-zoom: iki parmak zoom+pan (`ViewportManager`, %25-400), ctrl+tekerlek zoom, sağ altta -/%/+ kontrolleri + sıfırlama; tüm araçlar dünya koordinatına geçti
- [x] YAPILDI — iOS çift-dokunma zoom'u: butonlara `touch-action: manipulation`
- [x] YAPILDI — Pile duyarlı kayıt: şarjda 10sn, pilde 30sn (`src/autosave/AutoSaveManager.ts`)
- [x] YAPILDI (ara çözüm) — PC trackpad pinch: sayfa zoom'u kilitlendi, gerçek yakınlaştırma pinch-zoom aracını bekliyor (`src/core/Application.ts`)

## Çizim gecikmesi (tahta) — incelenecek

- Belirti: Tahtadaki kurulu programda (Electron) yazı/çizgi parmağın gerisinden geliyor. PC'de hissedilmiyor.
- Olası sebepler (öncelik sırasıyla):
  1. Her `pointermove`'da tüm sahne baştan çiziliyor (`DocumentRenderer.render`); çizgi arttıkça kare maliyeti büyüyor.
  2. `StrokeRenderer` opak çizgilerde kesit başına ayrı `beginPath()+stroke()` + kare başına `new Point` üretiyor.
  3. `getCoalescedEvents` ile stoğa eklenen nokta sayısı katlanıyor.
  4. Tahtada GPU hızlandırma kapalı olabilir (Linux/Electron) → 4K tuval yazılımla çiziliyor. Kontrol: GPU-process/swiftshader izleri, Electron bayrakları.
- Aday çözüm: artımlı çizim (bitmiş sahne önbelleği + üstüne yalnız yeni kesit) + toplu path + nokta seyreltme + rAF birleştirme. PC'yi olumsuz etkilemez (hızlanır); kritik nokta önbellek geçersiz kılma (undo, seçim, zoom/pan, boyut, kılavuz, resim yükleme).
- Durum: Kullanıcı mevcut haliyle tahtada tekrar deneyip dönecek, ondan sonra bakılacak.
