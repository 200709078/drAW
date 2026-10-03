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

Metin aracı için `/tests/text-ui.html` ve `/tests/text-ui.html?tahta=1`:
araç düğmelerinin tek seçimi, metni bitirme, yeni çizim/kapanış öncesi kayıt,
kayıt hatası, metin içi klavye kısayolları, yeniden düzenleme, taşıma,
boyutlandırma, silme ve undo/redo kontrol edilir.

Kılavuzlar için `/tests/guides-ui.html` ve `/tests/guides-ui.html?tahta=1`:
gerçek tuval piksellerinde kareli/yatay/dikey çizgilerin görünürlüğü, zoom,
kesirli kaydırma ve Yeni Çizim sonrası palet sıfırlaması kontrol edilir.
Bu sayfa masaüstü başlık çubuğunun tuval ofsetini de kullanır; farklı pencere
boyutları ve piksel yoğunluklarıyla çalıştırılabilir.

Ekran alıntısı penceresinde gerçek tarayıcı dokunma olaylarını sınamak için:

```sh
node scripts/build-overlay-preload.mjs
node tests/overlay-touch.cjs
```

Chromium kurulu olmalıdır; farklı bir konum için `CHROMIUM` ortam değişkenini
ayarlayın. Test, gerçek alıntı HTML'ini ve Electron'un kullandığı `.cjs` kodunu
yapay bir ekran görüntüsü ve sahte IPC ile açar; masaüstünüzün görüntüsünü almaz.
Dokunma, kalem ve fareyle seçim çizme/taşıma/boyutlandırma; çoklu dokunma,
hareket iptali, küçük seçimler ve yüksek DPI kırpma koordinatları kontrol edilir.
