# drAW yol haritası

Bekleyen işler, kullanıcı istekleri ve fiziksel tahtada doğrulanacaklar. Bir madde
kullanıcı açıkça istemeden uygulanmaz. Yeni istekler tarihle eklenir.

## Kullanıcı kararı / isteği bekleyenler

- **Dosya uzantısı (24 Ekim 2026, beklemede):** drAW çizim dosyaları ileride `.drw`
  uzantısını alacak (şu an `.draw.json`; eski dosyalar açılmaya devam etmeli). Ailenin
  kuralı: drAW `.drw`, drAW2D `.drw2`, drAW3D `.drw3`.
- **Avuçla silme (24 Ekim 2026, beklemede):** Silgi seçmeden avuçla silme. Plan:
  büyük temas (ör. >3 cm, `PointerEvent.width/height`) temas süresince geniş silgi
  gibi çalışır, bırakınca önceki araca dönülür. Tahtanın temas boyutu bildirmesine
  bağlı; önce tahtada parmak/avuç/iki parmak temas boyutları günlüğe yazılıp
  ölçülmeli. Avucun birden çok nokta gibi gelmesi iki parmakla yakınlaştırmayla
  karışmamalı. Tahta boyut bildirmiyorsa güvenilir yol yok.
- **Geliştirme önerileri (24 Ekim 2026):**
  - GitHub Actions: her push'ta `npm run typecheck` + `npm test` (henüz yok).
    Sürüm paketleri için iş akışı eklendi (24 Ekim 2026, `.github/workflows/release.yml`):
    Linux ve Windows paketleri GitHub'da üretilip sürüme yüklenir; ilk gerçek
    çalıştırma bekliyor.
  - Tek test komutu: tarayıcı testleri elle Vite başlatmayı gerektiriyor;
    etiket değişikliklerinden sonra `storage-ui` ve `quick-capture-ui` sessizce
    bozulmuştu. drAW2D/3D gibi Playwright ile `npm test` her şeyi çalıştırmalı.
  - Çizim gecikmesi için önce tahtada kare süresi ölçümü, sonra optimizasyon.
  - `ToolbarPanel.ts` bölünmeli; renk kontrolü ayrı modüle alınabilir.

## Tahta modu kalem kalınlıkları (2026-10-28)

- **Bulgu (kullanıcı, Yol 1, 1920×1080):** tahta modunda çizgiler çok kalın. Şu an
  `SMARTBOARD_LINE_WIDTHS = [24, 30, 36, 42, 50, 56, 70, 90]`, varsayılan 42
  (`src/platform/DeviceProfile.ts`); normal mod 1–32, varsayılan 6.
- **Açık soru:** tahtanın kendi bilgisayarının çözünürlüğü (test kılavuzundaki bilgi
  komutu, `xrandr | grep '*'`). 4K ise aynı değerler orada yarı kalınlıkta görünür ve
  Yol 1'deki izlenim yanıltıcıdır; 1080p ise değerler düşürülmeli.
- **Öneri:** 1080p çıkarsa `[12, 16, 20, 24, 30, 36, 44, 56]`, varsayılan 20 (bugünkünün
  yaklaşık yarısı); en ince iki değer el yazısı, kalınlar vurgu için. Daha doğrusu,
  kalınlığı ekranın fiziksel boyutuna göre hesaplamak.
- **Kullanıcı kararı ve uygulama (2026-10-28):** masaüstündeki 6 px tahtada iyi göründü; "42 fazla,
  düşür; silgi boyutu aynı kalsın". Tahta kalemi `[6, 8, 12, 16, 20, 28, 40, 56]`, varsayılan 16
  (parmakla ≈ 8 px). Silgi ve metin boyu paletteki sıraya göre eski değerleri (24–90) korur
  (`DeviceProfile.ts` `boardSizeStep`); `tests/pointer-eraser.test.cjs`.
- **Geri dönüş (kullanıcı, 2026-10-31):** 16 tahtada ince kaldı (PC ve mobilde sorun yok): "tahtada eskisi gibi olsun; biraz
  kullandıktan sonra tekrar düşünürüm." Tahta kalemi yeniden `[24, 30, 36, 42, 50, 56, 70, 90]`, varsayılan 42; `boardSizeStep`
  gereksiz kaldığı için silindi, silgi ve metin boyu değişmedi. Kullanıcı deneyip yeniden karar verecek; ara değer istenirse
  16 ile 42 arası (ör. 28) düşünülebilir.

## Mobilde yatay kullanım (2026-10-28)

**Kullanıcı isteği (2026-10-28, yalnız not):** mobilde yatay kullanıma izin vermesek nasıl olur?
Değerlendirme (öneri): Android'de yön `MainActivity` / manifestte `screenOrientation` ile
kilitlenebilir; ama kilit yalnız **telefonlara** uygulanmalı (en küçük ekran genişliği < 600 dp).
Tabletler ve Android'li akıllı tahtalar yatay ekranlıdır, dikeye kilitlemek onları bozar. Web'de
yön ancak tam ekranda kilitlenebilir (`screen.orientation.lock`); kilitsiz yatayda bir "telefonu
dik tutun" uyarısı alternatif. Açık sorular: yalnız telefonda mı, yalnız Android paketinde mi,
web'de de mi? Kullanıcı kararı bekliyor.

## Çizim gecikmesi (tahta)

- Belirti: Tahtadaki kurulu programda yazı/çizgi parmağın gerisinden geliyor; PC'de
  hissedilmiyor. Kullanıcı tahtada deneyip geri bildirim verecek; iş ondan sonra.
- Olası sebepler: her `pointermove`'da tüm sahnenin baştan çizilmesi
  (`DocumentRenderer.render`); `StrokeRenderer`'da kesit başına `beginPath()+stroke()`
  ve kare başına `new Point`; `getCoalescedEvents` ile nokta sayısının katlanması;
  tahtada GPU hızlandırmanın kapalı olması (Electron bayrakları, swiftshader).
- Yapılmadı: artımlı çizim, sahne önbelleği, toplu path, nokta seyreltme, rAF
  birleştirme. Undo, seçim, zoom/pan, boyut, kılavuz ve resim yüklemede önbelleğin
  geçersiz kılınması planlanmalı.

## Klasör bağlama — bekleyen ayrıntılar

- Açılışta otomatik bağ geri yükleme: `LinkedPhotoManager.restore()` var ama
  açılışta çağrılmıyor; son klasör hatırlanıyor, yeniden bağlama kullanıcıyla.
- Bağlı butonun ipucunda klasör adı (şu an yalnız "Klasör Bağını Kopar").
- Tutucu silinerek bağ koptuğunda kısa bilgi notu (şu an sessiz).

## Pardus Yazılım Merkezi başvurusu

Amaç mevcut çalışan sürümü en az riskle başvuruya hazırlamak; mimari, paket adı
(`draw`), çalıştırılabilir ad (`drAW`), lisans (MIT) ve kullanıcı veri biçimi
kullanıcıya sormadan değiştirilmez; kullanıcının sistemine izinsiz paket kurulmaz,
`/etc`, `/usr` vb. elle değiştirilmez.

- Yapıldı (24 Ekim 2026): `.desktop` `Categories=Education;`, `Comment[tr]`;
  `.deb` `Section: education`; `desktop-file-validate` geçti.
- Kalanlar: `lintian` denetimi (sistemde kurulu değil); kurulum/kaldırma
  (`apt install ./*.deb`, `apt remove/purge`) ve menüden açılma kontrolü; README'ye
  Pardus/ETAP kurulum-kaldırma bilgisi; `PARDUS_SUBMISSION.md` (bilinmeyen alanlar
  "KULLANICIDAN BİLGİ GEREKİYOR" olarak işaretlenir); paket açıklamasının
  Türkçeleştirilmesi/genişletilmesi; `.deb` `postinst/postrm` betiklerinin
  incelenmesi.

## Yapıldı

- **Yeni logo ve Android sürümü (25 Ekim 2026, kullanıcı isteği):** Logo kalemin yerine
  çizgili kağıda elle yazılmış mavi A ve kırmızı W ile sade bir kalem; drAW2D/drAW3D'nin
  simge ailesiyle aynı zemin, renk ve çizgi kalınlığı. Bütün simgeler
  `public/img/app-icon.svg`'den `scripts/icons.sh` ile üretilir. Android sürümü
  drAW2D/drAW3D'deki Capacitor projesiyle aynı yapıda (`com.madematik.draw`, Android
  7.0+); kullanıcı kararıyla kaydetme/açma/dışa aktarma yok, uygulama web sürümündeki
  gibi çalışır (çizimler cihazda kalır). Geri tuşu açık olanı kapatır, arka plana
  geçerken çizim kaydedilir. Yerelde test anahtarıyla imzalı APK derlendi ve denetlendi.
  **Telefonda deneme (25 Ekim 2026, Xiaomi 2201116TG, Android 13, MIUI 14, test
  anahtarlı APK, USB ile):** çizim, geri tuşu (palet → panel → seçim → arka plan),
  arka plana geçince kayıt ve kapatıp açınca kaydın kayıtlar panelinde açılması, metin
  aracı ve Türkçe klavye, drAW çift dokunuşla katlama, yatay ekran, iki parmakla
  yakınlaştırma çalıştı. Bulunup düzeltilenler: sistem yazı ölçeği (1,5×) bütün
  yazıları büyütüyordu (WebView `textZoom` 100); metin kutusu iki satır ve sabit
  genişlikti, tuvaldeki yazının yarım satır üstünde kalıyor, sağdan taşıyordu (masaüstünde
  de vardı); dar ekranda panel açılınca yakınlaştırma düğmeleri ekrandan taşıyordu;
  yatay telefonda toolbar solda yalnız 4–5 düğme gösteriyordu (artık altta, kaydırılır);
  geri tuşu seçimi kaldırmıyordu.
  **Bekleyen:** imza secret'ları girildi (kullanıcı, 25 Ekim 2026); ilk gerçek Android
  derlemesi (`yayinla=false`) ile parolalar doğrulanacak. Sürüm yükseltme ve yayımlama
  kardeşlerle birlikte (kullanıcı kararı). Telefondaki test sürümü test anahtarıyla
  imzalı: gerçek APK kurulmadan önce kaldırılmalı.
- **Kılavuz testi sınırı (25 Ekim 2026):** `tests/guides-ui.html` çok kısa pencerede
  (ör. 840×380) %400 yakınlaştırmada çizgiyi tuvalin dışında arıyor ve başarısız oluyor;
  değişiklik öncesi kodda da aynı. Uygulamayla ilgisi yok; test örnek noktaları kısa
  tuvale göre seçilmeli.

- **Palet renkleri (24 Ekim 2026):** Beyaz tahtada zor görülen sarı `#ffff00` →
  `#d4ac00` (beyaza karşı kontrast 1,07 → 2,16; turuncudan ayrık kalsın diye daha
  koyu değil), yeşil `#00ff00` → `#00a000` (1,37 → 3,48). Tahtada görünürlüğü
  doğrulanacak.

## Fiziksel tahtada / Windows'ta doğrulanacaklar

- Windows: Alan alıntısı penceresinin hızı (önceden 4–5 sn). Hâlâ yavaşsa
  `%APPDATA%\drAW\logs\quick-capture.log` satırları istenir (kaynak/png/yüklendi/
  görünme adımları). Windows'un gerçek ekran yakalaması.
- Pardus ETAP: ekran klavyesinin tam ekranda otomatik açılması ve Türkçe giriş;
  Alan'a geçişteki beyaz ekranın kısalması; kılavuz paleti görünürlüğü ve konumu;
  toolbar'ın altta sabit kalması ve drAW çift dokunuşla katlanması; kılavuz
  çizgilerinin görünürlüğü; silgi boyutlarının hissi; klasör bağında dokunma,
  silgi, yeniden bağlama ve dosya seçicinin önceki konumu hatırlaması; tek ekranlı
  sistemde alıntı ekran eşleştirmesi; PipeWire/portal izin istemi.
- İki ekranlı Linux (dizüstü + tahta HDMI): drAW tahta ekranındayken Tam Ekran ve Alan
  alıntısı (28 Ekim'de hata verdi; eleme ve bütün masaüstünden kesme eklendi, bkz.
  `docs/tahta-test-notlari.md`). Hata sürerse `quick-capture.log` son satırı.

## Akıllı tahta testleri — yöntem (2026-10-26)

**Kullanıcı kararı:** Projelerde biraz daha ilerledikten sonra yapılacak; gerekirse üç yol sırayla
denenir:

1. **HDMI + dokunmatik USB ile tahta bilgisayara bağlı:** tahta büyük bir dokunmatik ekran olur;
   `npm run dev` ile anında deneme. Dokunma, iki parmak, araç çubuğu, kalınlık/renk görünürlüğü
   için. Tahta modu web'de `?tahta=1` ile zorlanabilir; dokunuş kayarsa ekran yansıtılır ya da
   dokunmatik HDMI çıkışına eşlenir. Çizimi bilgisayar yaptığı için tahtadaki gecikmeyi göstermez.
2. **Tahtanın kendi bilgisayarında, kurmadan:** `npm run dev -- --host`, tahtanın tarayıcısında
   `http://<bilgisayar-IP>:5173/?tahta=1`. Gerçek tahta donanımında web sürümü; gecikme için. Aynı
   ağ gerekir (okul ağı ayırıyorsa telefon paylaşımı). Electron'a özgü işleri sınamaz.
3. **Kurulu paketle (.deb / AppImage):** ETAP'a özgü maddeler (ETA Klavye, ekran alıntısı, klasör
   bağı, paket davranışı) ve sürüm öncesi son kontrol.
- drAW'da önce "Çizim gecikmesi (tahta)" için yol 2 ile ölçüm. **Öneri:** `?olcum=1` ile köşede kare
  süresi ve gecikmeyi gösteren küçük bir ölçüm kutusu; kullanıcı onayı bekliyor.
