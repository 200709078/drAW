# Regresyon testleri

Node.js testlerini proje dizininden çalıştırın:

```sh
node --test tests/*.test.cjs
```

Arayüz kontrolü için `npm run dev` komutunu çalıştırıp Vite adresinde
`/tests/storage-ui.html?tahta=1` sayfasını açın. Sayfa test sonunda `PASS`
veya `FAIL` sonucunu gösterir. Test, gerçek uygulama arayüzünü ve bellekte
tutulan sahte masaüstü depolamasını kullanır; kullanıcının çizim dosyalarına erişmez.

Standart profil için aynı sayfayı `?tahta=1` olmadan açın. Kalınlık paletinin
değerleri, dört şeklin çizgi kalınlığı ve kayıt/undo/redo sonrası korunması,
iki silginin göstergesi %25, %100 ve %400 yakınlaştırmada da kontrol edilir.
Tahtada çizgi silgisinin palet değerinden %10 büyük olması, normal silginin
bundan %10 daha büyük olması ve iki silginin de 4 saniye işlem yapılmayınca
Normal Kalem'e dönmesi sınanır. Zamanlayıcının dokunma/kalem/fare teması,
çoklu temas, iptal ve araç değişimi kontrolleri `eraser-idle.test.cjs` içindedir.

Metin aracı için `/tests/text-ui.html` ve `/tests/text-ui.html?tahta=1`:
araç düğmelerinin tek seçimi, metni bitirme, yeni çizim/kapanış öncesi kayıt,
kayıt hatası, metin içi klavye kısayolları, yeniden düzenleme, taşıma,
boyutlandırma, silme ve undo/redo kontrol edilir.

Kılavuzlar için `/tests/guides-ui.html` ve `/tests/guides-ui.html?tahta=1`:
gerçek tuval piksellerinde kareli/yatay/dikey çizgilerin görünürlüğü, zoom,
kesirli kaydırma ve Yeni Çizim sonrası palet sıfırlaması kontrol edilir.
Bu sayfa masaüstü başlık çubuğunun tuval ofsetini de kullanır; farklı pencere
boyutları ve piksel yoğunluklarıyla çalıştırılabilir.

Ekran alıntısını sınamak için Vite sunucusu açıkken:

```sh
node scripts/build-preloads.mjs
node tests/quick-capture-browser.cjs
```

Chromium kurulu olmalıdır; farklı bir konum için `CHROMIUM` ortam değişkenini
ayarlayın. Vite farklı bir porttaysa `DRAW_TEST_URL=http://127.0.0.1:5179`
kullanılabilir. Test, gerçek seçim HTML'ini ve Electron'un kullandığı `.cjs`
kodunu yapay bir ekran görüntüsü ve sahte IPC ile açar; masaüstünüzün görüntüsünü almaz.
Parmak/kalem/fare, iki yönde sürükleme, ikinci parmak, iptal, küçük seçim,
yüksek DPI ve boş kenarlı kaynaklarda koordinatlar kontrol edilir.

`quick-capture-ui.html`, PC/tahta panelini, web/mobilde kapalı olmasını,
Tam Ekran yerleşimini, Alan ölçülerini, başlık çubuğu, zoom, araç değişimi,
undo/redo ve gecikmiş sonuçları sınar. Panel önizlemeleri test sırasında
`/tmp/draw-quick-capture-pc.png` ve `/tmp/draw-quick-capture-board.png` olarak yazılır.

`quick-capture.test.cjs` ana süreç davranışını sahte Electron pencereleriyle;
`record-limit.test.cjs` son 30 kaydın tutulmasını ve kayıt hatasında verilerin
korunmasını bellekteki depolamayla sınar. Bunlar gerçek Windows veya fiziksel
akıllı tahta doğrulaması yerine geçmez.

Alıntı testleri, tek ekranlı Linux'ta farklı ekran kimliklerini ve JavaScript'in
kesin temsil aralığını aşan kimlikleri de kapsar. Tam Ekran/Alan için 4K kaynak,
ikinci ekran, değişen hedef ekran, boş görüntü ve düşük çözünürlük sınanır.

Gerçek Electron ve masaüstü yakalaması için:

```sh
npm run build
npx electron tests/quick-capture-electron.cjs
```

Bu kontrol gerçek ekranı kullanır ve geçici drAW/alan seçimi pencereleri açar;
çalışırken bu pencerelerin odağını değiştirmeyin. Geçici profil ve bellekteki
çizim deposuyla çalışır, görüntüleri dosyaya yazmaz. Kamera düğmesinin yalnız
paleti açmasını, Tam Ekran ve Alan akışlarını, özgün piksel ölçülerini ve
tuvale eklenince geri almanın etkinleşmesini sınar. GNOME/X11 üzerinde %125
ölçekle geçti; fiziksel tahta ve Windows kontrolleri ayrıca yapılmalıdır.
