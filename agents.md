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

## Klasör Bağlama özelliği — durum notu (KODLANMADI)

### Netleşen konular

- Klasör Bağla butonu klasör değil, klasör içinden **bir fotoğraf** seçtirir; seçilen fotoğraf canvasa tutucu olarak eklenir, üstüne çizim yapılır.
- Klasör + fotoğraf bilgisi ve bağ durumu (bağlı/değil) yerelde saklanır; kapatıp açınca buton aynı klasör+fotoğrafa bağlanabilir; tekrar basınca bağ kopar.
- Fotoğraf seçim aracıyla seçilince sil/taşı/boyutlandırma aynen olur; ek olarak sil butonu yanı veya sağ/sol kenarlarda **Önceki/Sonraki fotoğraf** butonları olur (klasörde gezinme).
- Bağlıyken Yeni Çizim → yeni çizim + otomatik tutucu ile **gösterilmekte olandan sonraki** fotoğraf (ayrı sayaç yok, klasör sırasındaki konum baz alınır).
- Bağ kopunca açık olan fotoğraf ekranda kalır (normal resim gibi), Önceki/Sonraki butonları görünmez. Çizim yapılıp yapılmaması fark etmez.

### Sorunlu yerler + öneriler

1. Büyük fotoğraflar: dataURL kayda gömülürse depo şişer, 50 kayıt limiti gerçek çizimleri silebilir. Öneri: eklerken uzun kenarı ~1920px'e indir.
2. Fotoğraf sırası tanımsız: isme göre doğal sıralama önerilir (`1.jpg, 2.jpg, 10.jpg`); tek fotoğrafta butonlar pasif.
3. Tutucuyu ayırt etme: ekran alıntısı gibi başka resimlerle karışmamalı; bağlı tutucu id/işaretle takip edilmeli, Önceki/Sonraki yalnız o seçiliyken görünmeli.
4. Yerine koyma vs yeniden ekleme: tutucunun içeriğini değiştir (konum/seçim korunur), silip yeniden ekleme.
5. Dosya kaybolursa (silinme/taşıma): bilgi ver + bağı kopar.
6. Buton yeri önerisi: sol panel, Yeni Çizim yakını; bağlıyken klasör adını göstermeli.
7. Platform: Electron'da dosya erişimi kolay; webde File System Access API (yalnızca Chromium + her açılışta izin); Android kapsam dışı önerilir.

### Onay gereken açık sorular (kodlamadan önce)

**KAPSAM KARARI:** Klasör Bağlama yalnız tahta + PC'de (Electron) çalışır; web ve mobilde çalışmaz (buton görünmez).

1. ~~Önceki/Sonraki ile fotoğraf değişince mevcut çizgiler ne olacak?~~ **KARAR:** Çizgiler aynen kalacak, yalnız fotoğraf değişecek.
2. ~~Tutucu elle silinirse Önceki/Sonraki ne yapacak?~~ **KARAR:** Bağ otomatik kopar; foto+çizimler ekranda kalır, yeniden bağlamak kullanıcıya kalır. Kopuş her silme yoluna kanca takılarak değil, bağ kullanılacağı anda (Önceki/Sonraki, Yeni Çizim) tutucunun sayfada olup olmadığına bakılarak yakalanır (tembel doğrulama). Kopunca küçük bilgi notu gösterilir, onay kutusu yok.
3. ~~Klasörde fotoğraf yoksa / tek fotoğrafsa davranış?~~ **KARAR:** Boş klasörde fotoğraf seçilemediği için bağ kurulamaz (iptal edilir). Tek fotoğrafta o seçilir, Önceki/Sonraki pasif olur.
7. Yeni Çizim + son fotoğraf: Tek fotoğraf varsa veya klasördeki son fotoğraftayken Yeni Çizim'e basılırsa bağ kopar, her şey normal haline döner. İlk fotoğrafta Önceki, son fotoğrafta Sonraki pasif olur.
4. ~~Alt klasörler taransın mı, yalnız üst düzey mi?~~ **KARAR:** Yalnız seçilen klasör taranacak, alt klasör yok.
5. Dosya filtresi: yalnız resim uzantıları; `Thumbs.db`, `.DS_Store`, `desktop.ini` elenecek. Tembel yükleme (yalnız gösterilen fotoğraf okunur).
6. Boyut kuralı: uzun kenar 1920px'ten büyükse indir, küçükse aynen al. Yerleşim: tuvale içine sığdır (contain).
7. **KARAR:** Klasör Bağla butonu sol panelde metin aracının solunda durur. Üstünde yazı yazmaz, yalnız ikon gösterir: bağlı değilken zincir (link) ikonu, bağlıyken kırık zincir ikonu. Açıklama `title`/ipucunda çıkar (örn. bağlıyken klasör adı + koparma bilgisi).
8. **KARAR:** Sıralama isme göre doğal sıralamadır.
9. **KARAR:** Tutucu ilk eklenişte sol üst köşeye konur, yüksekliği ekran yüksekliğinin yarısı olur, en-boy oranı korunur.
10. **KARAR:** Önceki/Sonraki aynı tutucunun içeriğini değiştirir, konumu korur. Tutucunun sol üst köşesi sabit kalır, başka fotoğrafa geçince en-boy oranı yeniden hesaplanır.
11. **KARAR (undo):** Fotoğraf ekleme/değiştirme geçmişe yazılmaz (B). Gerekçe: dataURL kopyalarıyla bellek şişmesi, undo'nun fotoğraf gezgini gibi davranıp kafa karıştırması; çizim değiştirmede geçmişin sıfırlanması emsali. Undo yalnız çizgileri etkiler.
