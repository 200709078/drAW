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

- [ ] Küçük dokunma hedeflerini büyüt (mobil/tablet): 26px seçim-sil + kart aksiyonları, 35px renk/genişlik paletleri, 25-27px kenar okları -> en az 44px (`src/style.css`)
- [ ] Yatay modda sol panel taşması: `.toolbar-left-panel`'e `max-height` + kaydırma (`src/style.css:473-490`)
- [ ] Pinch-zoom / tuval kaydırma aracı (mobilde detay çalışması için; yeni araç + renderer ölçeği — büyük iş)
- [ ] iOS çift-dokunma zoom'u: arayüz butonlarına `touch-action: manipulation`
- [ ] Otomatik kayıt temposu/batarya: 10sn aralığı mobilde gözlemle, gerekirse pil durumuna göre esnet (`src/autosave/AutoSaveManager.ts`)
- [ ] PC trackpad pinch-zoom (düşük öncelik)
