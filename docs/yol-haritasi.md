# drAW yol haritası

Bekleyen işler, kullanıcı istekleri ve fiziksel tahtada doğrulanacaklar. Bir madde
kullanıcı açıkça istemeden uygulanmaz. Yeni istekler tarihle eklenir.

## Paket bilgisindeki e-posta (2026-11-06, kullanıcı bildirdi)

Pardus ETAP tahtada Paket Kurucu'nun Detaylar sekmesinde drAW ailesinde olmayan `madematik@madematik.com` görünüyordu,
awPDF'te `ademvarol@madematik.com`. Kaynak 2026-11-03'te düzeltilmişti ama o tarihten sonra sürüm çıkmamıştı;
yeni sürüm bu adresi taşır. Aynı sürümde drAW'ın paket açıklaması Türkçe oldu ("drAW — Etkileşimli tahta ve çizim uygulaması"; İngilizce `synopsis` kaldırıldı). **Yapıldı (2026-11-06).**

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

- **Simgede büyük kalem (9 Kasım 2026, kullanıcı isteği):** Eski logoda kalem 32 pikselde bir
  çizgiye iniyordu ve yuvarlak Android maskesinde silgi ucu kesiliyordu. Kâğıt çerçevesi
  kalktı (yalnız soluk satır çizgileri kaldı), A ve W biraz küçüldü; kalem yaklaşık 1,5 kat
  uzun, gövdesi üç tonlu ve ucu W'nin sağ alt köşesinde. Kalem 30° yatık, böylece W'nin son
  çizgisini örtmüyor. Kullanıcı dört deneme arasından seçti; bütün simgeler yeniden üretildi.
  Henüz yayınlanmadı (sürüm, canlı site, Play).
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

## Ortak araç çubuğu stili (2026-11-10, kullanıcı isteği; awCELL, awPDF, drAW, drAW2D, drAW3D; kodlanmadı)

Kullanıcı: "Bu menü sistemini awPDF ve drAW kardeşlerde de uygulayabileceğimiz bir şey olmalı. Aynı stile çekebilmek
için." awCELL'de araç çubuğu 39 düğmeden 13 düğmeye indirilirken kararlaştırıldı.

**Ortak kurallar** (beş projenin yol haritasında aynı; birinde değişirse ötekiler de güncellenir; ayrıntılı not ve
gerekçeler `awCELL/docs/yol-haritasi.md`'de):

1. **Taşma menüsü ☰ / ✕:** Sığmayan düğmeler sondan başlayarak ☰ menüsüne geçer; açıkken düğme ✕ olur ("Menüyü aç" /
   "Menüyü kapat"). "⋯" ve kaydırma okları kullanılmaz; pencere boyutu değişince yeniden hesaplanır. Örnek: awPDF
   `src/ui/toolbar.ts` (`mountOverflowMenu`).
2. **Kapanma:** ✕, dışarıya dokunma, Esc, Android geri düğmesi, menüden bir iş seçme (art arda seçim yapılan gruplar
   hariç).
3. **Gruplar:** Çubukta grup başına tek düğme ve ▾; tıklayınca açılır, üstüne gelince değil; aynı anda tek pencere.
4. **Son kullanılan:** Grup düğmesi son seçilen aracı/işi gösterir (drAW2D'deki gibi).
5. **Durum gösterimi:** Grubun içindeki etkin seçim grup düğmesinden de anlaşılır.
6. **☰ menüsünün içi:** Grup başlıkları simge ve etiketle görünür, yerinde (akordeon gibi) açılır, aynı anda tek grup
   açık. Herkesin tanıdığı simgeler grup içinde yalnız simge olarak yan yana; yanlış anlaşılabilecekler simge ve
   etiketle. Tek düğmeler simge ve etiketle, doğrudan iş yapar. Gerekçe: dokunmatikte ipucu (`title`) çıkmaz.
7. Dokunma alanları çubukta ve menüde aynı büyüklükte kalır.

Ortak kod paketi yok; her proje kendi kopyasını yazar, davranış aynı tutulur. Önce awCELL'de uygulanacak; bu proje
sonra, kullanıcı onayıyla.

**drAW'a uyarlama — kullanıcı kararı (2026-11-10); uygulandı (2026-11-10, aşağıdaki "Yapıldı" notu):**

Kullanıcı: "drAW araç çubuğu senin önerdiğin gibi olsun." Görüşülenler: awPDF gibi üstte sabit çubuk düşünüldü; tahtada
üst kenar yüksekte kaldığı ve çubuğa derste sık dokunulduğu için alt seçildi. Telefonu yalnız dikey ya da yalnız yatay
çalıştırmak (yön kilidi) da konuşuldu; dikey çubuk kalkınca gerek kalmadı.

- **Çubuk her zaman altta ve yatay.** Sola yaslanan dikey çubuk (`dock-left`, `updateToolbarLayout`'taki kenar seçimi)
  tamamen kalkar; dik tutulan telefonda da çubuk altta durur. Yön kilidi yok, telefon iki yönde de çalışır.
- **☰ / ✕ çubuğun sağ ucunda;** sığmayan düğmeler kaydırma yerine ☰ menüsüne geçer, menü yukarı doğru açılır. Kapanma
  ortak kurallardaki gibi (✕, dışarıya dokunma, Esc, Android geri tuşu, bir iş seçme).
- **Taşma sırası:** önce az kullanılanlar (kılavuz, Ekran Alıntısı, klasör bağlantısı, önceki/sonraki çizim, yeni
  çizim, şekiller, metin…). Geri al, yinele, kalem, silgi ve renk hiçbir zaman ☰'ye düşmez. Kesin sıra kodlarken
  önerilir.
- **Değişmeyenler:** "drAW" tutamacı sol uçta, çift dokunuşla katlama sürer; paletler (kalem, silgi, şekil, renk,
  kalınlık, kılavuz, alıntı) açılır palet olarak kalır, 3.–5. kurallara göre gözden geçirilir (tıklayınca açılma, aynı
  anda tek palet, düğmede son seçim ve etkin durum). Yakınlaştırma düğmelerinin çubuğun üstüne çıkması sürer.
- **Tahta / PC modu:** Çubuk iki modda da aynı (aynı düğmeler ve sıra); tahta modu bugünkü gibi yalnız 1,2 kat büyütür.
  ☰ moda göre değil yer kalmayınca çıkar. Bugünkü çubuk (16 düğme) PC'de yaklaşık 940 px, tahtada yaklaşık 1130 px
  (hesap, ölçülmedi); 1920 px tahtada da 1366 px dizüstünde de sığar, ☰ yalnız telefonda ve dar pencerede görünür.
  Bugünkü farklar sürer: Ekran Alıntısı ve klasör bağlantısı yalnız masaüstü uygulamasında; kalınlık değerleri
  tahtada büyük.
- Tahtada ve telefonda (dikey ve yatay) denenir; Playwright'ta geniş (~1600 px) ve dar (~360 px) pencere.
- Not: drAW2D ve drAW3D'de çubuk üstte; tahtada aynı erişim sorunu olabilir, ayrı karar (kullanıcıya önerildi).
- **Yapıldı (2026-11-10):** Dikey çubuk kaldırıldı; çubuk her pencerede altta. Sığmayanlar şu sırayla ☰'ye geçer:
  kılavuz, Ekran Alıntısı, klasör bağlantısı, sonraki çizim, önceki çizim, yeni çizim, metin, şekiller, seç ve taşı,
  kalınlık, önceki renk. Menüde her düğme simge + etiketle; paletli düğmenin paleti satırın altında yerinde açılır.
  Kapanma: ✕, dışarıya dokunma, Esc, Android geri tuşu, bir iş seçme; çubuktaki bir palet açılınca menü kapanır.
  480 px'ten dar ekranda düğmeler 44 px'e iner, kenar payı 8 px olur: 360 px telefonda çubukta drAW, renk, geri al,
  yinele, kalem, silgi ve ☰ kalır. Açık menü ve palet yakınlaştırma düğmelerinin üstünde durur. Palet dar ekranda
  satırlara bölünür (dikey telefonda renk paleti iki satır). Ölçüm: PC 1366 px'te çubuk 835 px, tahtada 1920 px'te
  1001 px (web; masaüstü uygulamasında alıntı ve klasör düğmesiyle biraz daha geniş) — ikisinde de ☰ yok. 760 px
  pencerede 3, yatay telefonda (740 px) 4, dikey telefonda (360 px) 9 düğme menüde.
  Denendi: tip denetimi, `npm test` (282), `guides-ui` / `storage-ui` / `text-ui` (geniş, dar, tahta), alıntı
  (104) ve metin (59) tarayıcı testleri; telefonun Chrome'unda gerçek dokunuşla menü, palet, çizim, geri al, renk.
  Telefon boyutundaki 4 sayfa testi (390×844 ve 844×390'da kılavuz görünürlüğü, bağlı fotoğraf) değişiklikten önce de
  aynı hatayla kırılıyordu; çubukla ilgisiz. Tahtada fiziksel deneme bekliyor.
  Yayın (2026-11-10, kullanıcı izniyle): madematik.com/drAW canlıda (önceden commit'lenmiş yeni simgeyle birlikte),
  GitHub sürümü v0.0.9 (apk, deb, AppImage, exe). Yükleme adımı bir kez GitHub'ın geçici 408 hatasıyla düştü,
  yeniden çalıştırınca geçti.
- **Sonraki sürümde yapılacak (2026-11-10, kullanıcı kararı):** ☰ menüsü ya da bir palet açıkken onu kapatmak için
  tuvale yapılan dokunuş çizmesin (bugün kalemle bir nokta çiziyor; paletler de öyle). Kullanıcı: "yeni sürüme
  geçirecek olursak değiştirirsin." Yeni sürüm çıkarılmadan önce bu iş yapılır.
  Aynı kural çizimler paneli için de (2026-11-10, kullanıcı isteği): panel açıkken tuvale dokunmak paneli kapatıyor
  (`DrawingsPanel`, tuvalde `pointerdown`); kapatan bu dokunuş da çizmesin. Kullanıcı: "çizimler penceresi kapanırken
  çizim yapmayacak şekilde düzenleyelim" — sonraki sürümden önce, menü/palet işiyle birlikte.

## Hakkında penceresi (2026-11-10, kullanıcı kararı; drAW2D'de uygulandı; bu projede kodlanmadı)

Kullanıcı: "Hakkında yardım gibi ayrı pencerede açılsa nasıl olur?" → "tamam öyle yapalım. Diğer kardeşlere de bunu not et
(özellikle hakkında kısmı hepsinde olmalı)." Aile kuralı: drAW, drAW2D, drAW3D, awPDF ve awCELL'in **hepsinde** Hakkında olur.

- **Ayrı küçük pencere:** uygulamanın yardım/diyalog pencereleriyle aynı görünüş (başlık şeridi, ×). Kapanma: ×, dışarıya
  dokunma, Esc, Android geri tuşu.
- **İçerik:** uygulamanın simgesi, adı ve sürümü (`package.json`'dan otomatik), bir satırlık açıklama; mADEMatik Solutions ve
  madematik.com bağlantısı; indirme bağlantısı (GitHub sürümleri: Linux, Windows, Android); lisans MIT; "Öneri ve sorunlar:
  ademvarol@madematik.com" (seçilebilir düz yazı; e-posta bağlantıları tahtada ve telefonda çoğu zaman bir şey açmaz).
- **Bağlantılar** sistemin tarayıcısında açılır (Electron: `shell.openExternal`; Android: uygulamanın içinde değil, tarayıcıda).
- **Yer:** Dosya menüsünün en altı (drAW2D kararı); Yardım da hem çubukta hem Dosya menüsünde kalır.
- **drAW'a uyarlama (öneri):** drAW'da Dosya menüsü ve yardım penceresi yok. Hakkında, sağ uçtaki ☰ menüsünün en altına
  bir satır olarak girer (çubuk sığdığında ☰ görünmediği için drAW tutamacının yanında ya da çizimler panelinde de bir
  bağlantı düşünülebilir; karar kullanıcıda).

