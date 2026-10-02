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

## Platform ve akıllı tahta — yapılanlar

- [x] YAPILDI — Tahta görünümü, tahta kalem kalınlıkları ve metin boyutu sınırları (`src/platform/DeviceProfile.ts`, `src/style.css`).
- [x] YAPILDI — Dokunma hedefleri büyütüldü: seçim/sil ve kart aksiyonları 44px, kenar okları 40px; paletler dar ekranda sarılıyor (`src/style.css`).
- [x] YAPILDI — Yatay modda sol panel için `max-height` ve kaydırma (`src/style.css`).
- [x] YAPILDI — İki parmakla yakınlaştırma ve tuval kaydırma: %25–400, Ctrl+tekerlek, -/%/+ kontrolleri ve sıfırlama. Araçlar dünya koordinatlarını kullanıyor (`PointerManager`, `ViewportManager`, `ZoomControls`).
- [x] YAPILDI — PC trackpad pinch için tarayıcı sayfa zoom'u engelleniyor; Ctrl+wheel olayları uygulamanın yakınlaştırmasına aktarılıyor (`src/core/Application.ts`, `src/core/PointerManager.ts`).
- [x] YAPILDI — Butonlarda çift dokunma zoom'unu engelleyen `touch-action: manipulation` (`src/style.css`).
- [x] YAPILDI — Dokunma/kalem örnekleri için `getCoalescedEvents`, araçlarda aktif `pointerId` takibi (`src/tools/PenTool.ts`, silgi ve seçim araçları).
- [x] YAPILDI — Silme sırasında iki parmakla yakınlaştırmaya geçince kalan parmaklar çizim aracına aktarılmıyor; silme geçmişi korunuyor (`tests/pointer-eraser.test.cjs`).
- [x] YAPILDI — Araç değiştirme sırasında seçim hareketi temizleniyor; eski dokunma yeni seçimi engellemiyor (`tests/selection-switch.test.cjs`).
- [x] YAPILDI — Boyutlandırmanın son konumu bırakma anında uygulanıyor; tutamacın kenarına dokunmak fotoğrafı sıçratmıyor. Dokunma, kalem ve fareyle %25–400 yakınlaştırmada test edildi (`src/tools/SelectionTool.ts`).
- [x] YAPILDI — Pile duyarlı kayıt: şarjda 10 saniye, pilde 30 saniye (`src/autosave/AutoSaveManager.ts`).
- [x] YAPILDI — 400px küçük önizlemeler (`src/autosave/ThumbnailGenerator.ts`).
- [x] YAPILDI — Kayıt sırasında gelen yeni değişiklikler de kaydediliyor; kayıt hatası Yeni Çizim, kayıt açma ve kapanışı durduruyor. Yavaş kayıt pencereyi zorla kapatmıyor (`tests/autosave.test.cjs`, `tests/shutdown.test.cjs`).

## Çizim gecikmesi (tahta) — incelenecek

- Belirti: Tahtadaki kurulu programda (Electron) yazı/çizgi parmağın gerisinden geliyor. PC'de hissedilmiyor.
- Olası sebepler (öncelik sırasıyla):
  1. Her `pointermove`'da tüm sahne baştan çiziliyor (`DocumentRenderer.render`); çizgi arttıkça kare maliyeti büyüyor.
  2. `StrokeRenderer` opak çizgilerde kesit başına ayrı `beginPath()+stroke()` + kare başına `new Point` üretiyor.
  3. `getCoalescedEvents` ile stoğa eklenen nokta sayısı katlanıyor.
  4. Tahtada GPU hızlandırma kapalı olabilir (Linux/Electron) → 4K tuval yazılımla çiziliyor. Kontrol: GPU-process/swiftshader izleri, Electron bayrakları.
- [ ] BEKLİYOR — Artımlı çizim, sahne önbelleği, toplu path, nokta seyreltme ve rAF birleştirme uygulanmadı. Undo, seçim, zoom/pan, boyut, kılavuz ve resim yükleme sırasında önbelleğin geçersiz kılınması planlanmalı.
- [ ] BEKLİYOR — Pardus ETAP 25 üzerinde çizim gecikmesi ve GPU kullanımı ölçümü. Kullanıcı tahtada deneyip geri bildirim verecek; bu çalışma o geri bildirimden sonra ele alınacak.

## Klasör bağlama — YAPILDI

Uygulama `src/photos/LinkedPhotoManager.ts` ve `electron/photo-folder.ts` içinde mevcut. Önceki “kodlanmadı” notu güncel değildi.

### Yapılanlar

- [x] YAPILDI — Özellik Electron'da tahta ve PC için kullanılabilir; dosya köprüsü olmayan web sürümünde buton gizli. Web ve Android klasör erişimi kapsam dışında.
- [x] YAPILDI — Buton klasör içinden bir fotoğraf seçtiriyor; fotoğraf tuvale ekleniyor ve üzerine yazılabiliyor.
- [x] YAPILDI — Son klasör `draw:photo-last-folder` ile hatırlanıyor ve bağ kopunca korunuyor. Yerel depolama hatasında aynı oturumdaki klasör bellekte tutuluyor.
- [x] YAPILDI — Pardus/Linux dosya seçicisine önceki konum aktarılıyor; portal sürümü için `xdg-portal-required-version=4` ayarı var (`electron/main.ts`). Fiziksel ETAP doğrulaması aşağıda bekleyen olarak kayıtlı.
- [x] YAPILDI — Klasör ve fotoğraf bilgisi `draw:photo-link` ile saklanıyor. Bu kayıt tek başına açılışta bağı yeniden etkinleştirmiyor.
- [x] YAPILDI — Yalnız üst klasörün fotoğrafları taranıyor; alt klasörler, gizli dosyalar ve `Thumbs.db`/`.DS_Store`/`desktop.ini` eleniyor. Sıralama doğal isim sırası (`1.jpg`, `2.jpg`, `10.jpg`); yalnız gereken fotoğraf okunuyor.
- [x] YAPILDI — Uzun kenarı 1920px'i aşan fotoğraflar küçültülüyor; küçültülmüş JPEG geçerli base64 data URL olarak dönüyor (`tests/photo-folder.test.cjs`).
- [x] YAPILDI — İlk yerleşim sol üstte 16px payla, ekran yüksekliğinin yarısı ve fotoğrafın en-boy oranı korunarak yapılıyor. Bu, önceki “contain” önerisinin yerine alınan son karar.
- [x] YAPILDI — Bağlı tutucu kimliği diğer resimlerden ayrılıyor. Önceki/Sonraki okları yalnız o fotoğraf seçiliyken gösteriliyor; ilk/son fotoğrafta ilgili ok pasif.
- [x] YAPILDI — Fotoğraf gezinmesinde çizgiler korunuyor. Fotoğraf nesnesi aynı tutucu kimliği, konumu ve yüksekliğiyle yenileniyor; genişliği yeni en-boy oranına uyarlanıyor.
- [x] YAPILDI — Bağlı Yeni Çizim önce mevcut çizimi kaydediyor, sonra sıradaki fotoğrafı ekliyor ve **Seç ve Taşı** aracını etkinleştiriyor. Son fotoğrafta boş çizime geçiliyor ve bağ kopuyor.
- [x] YAPILDI — Fotoğraf hazırlama ve kayıt sırasında tekrar Yeni Çizim başlatılmıyor. Bu sırada başka kayıt açılırsa eski işlem yeni açılan çizimi değiştirmiyor.
- [x] YAPILDI — Geciken klasör seçimi, fotoğraf okuma ve gezinme sonuçları başka çizime veya yeni klasör bağına eklenmiyor.
- [x] YAPILDI — Fotoğraf ekleme ve gezinme undo geçmişinin dışında. Çizgi düzenlemeleri, fotoğraf geometrisi ve silme geri alınabiliyor; undo/redo güncel bağlı fotoğrafı tanıyor.
- [x] YAPILDI — Elle bağ koparılınca fotoğraf normal resim olarak sayfada kalıyor, oklar kapanıyor. Sonraki Yeni Çizim'de eski seçim çerçevesi/boş tutucu kalmıyor.
- [x] YAPILDI — Normal silgi bağlı fotoğrafı koruyarak yazıları siliyor. Stroke/Çizgi Silgi fotoğrafa doğrudan temas edince fotoğrafı da siliyor ve bağ kopuyor. Silmeyi geri almak bağı otomatik kurmuyor.
- [x] YAPILDI — Silgi fotoğrafın dışına değince fotoğraf kaldırılmıyor. Normal silginin koruması yalnız bağlı tutucu için; bağ koparılmış veya başka bir resim mevcut silme davranışını kullanıyor.
- [x] YAPILDI — Klasöre geçici erişim/okuma hatasında çizim ve bağ korunuyor. Başarıyla okunan listede bağlı dosya yoksa bilgi kutusu gösteriliyor ve bağ kopuyor.
- [x] YAPILDI — Bağ butonunda zincir/kırık zincir simgesi ve ekranda klasör/fotoğraf bilgisi var. Seçim aracı açıkken bağlanmak yeni fotoğrafın seçimini kaldırmıyor; eski gezinme düğmeleri araç değişiminde temizleniyor.

### Bekleyen ayrıntılar

- [ ] BEKLİYOR — Açılışta otomatik klasör bağı geri yükleme: `restore()` mevcut, ancak uygulama açılışında çağrılmıyor. Şu an son klasör hatırlanıyor; yeniden bağlama kullanıcı seçimiyle yapılıyor. Bu akış bu kontrolde etkinleştirilmedi.
- [ ] BEKLİYOR — Bağlı butonun ipucunda klasör adı: `title` şu an yalnız “Klasör Bağını Kopar”. Klasör/fotoğraf bilgisi ayrı durum alanında gösteriliyor.
- [ ] BEKLİYOR — Tutucu silinerek bağ koptuğunda kısa bilgi notu: şu anda bağ sessizce kopuyor; ayrı bildirim gösterilmiyor.
- [ ] BEKLİYOR — Fiziksel Pardus ETAP 25 üzerinde dokunma, silgi, yeniden bağlama ve dosya seçicinin önceki konumu hatırlama kontrolü. Chromium'da tahta/PC arayüz testleri geçti; bunlar fiziksel tahta testi sayılmaz.

## Doğrulama

- Son kontrolde 158 Node testi ve Chromium'da tahta/PC arayüz kontrolleri geçti.
- Node testleri: `node --test tests/*.test.cjs`.
- Arayüz: `npm run dev` ardından `/tests/storage-ui.html?tahta=1` ve `/tests/storage-ui.html` (`tests/README.md`).
- Testler sahte masaüstü depolaması kullanır; kullanıcının çizim dosyalarına erişmez.
- Linux paketleri: `npm run dist`; `.deb` ve `.AppImage` çıktıları `release/` altında. Windows paketi yukarıdaki Windows makine yönergesine göre üretilir.
