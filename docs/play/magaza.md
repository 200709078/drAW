# drAW — Google Play mağaza kaydı

Play Console'a girilecek metinler ve görseller. Görseller `npm run play:gorseller` ile yeniden üretilir
(uygulamanın görünüşü değişince). Sınırlar Play'in sınırlarıdır; `node scripts/play/sinirlar.mjs` metinlerin
sığdığını denetler.

## Ayrıntılar

- **Uygulama adı** (en çok 30 karakter):

<!-- ad -->
drAW: Akıllı Tahta ve Çizim
<!-- /ad -->

- **Kısa açıklama** (en çok 80 karakter):

<!-- kisa -->
Derste tahtada, tablette ve telefonda çizin, yazın, şekil çizin. Reklamsız.
<!-- /kisa -->

- **Tam açıklama** (en çok 4000 karakter):

<!-- tam -->
drAW, sınıfta akıllı tahtada, tablette ve telefonda ders anlatmak için tasarlanmış sade bir çizim uygulamasıdır. Pardus ETAP akıllı tahtalarda gerçek derslerde kullanılıyor. Reklam yoktur, hesap istemez, hiçbir veri toplamaz.

• Kalemler: normal kalem ve yazının üstünü boyayan fosforlu kalem; 8 renk, 8 kalınlık. Son kullandığınız renk hep bir dokunuş uzağınızda.
• Şekiller: düz çizgi, dikdörtgen, çember ve üçgen.
• Metin: tahtaya klavyeyle yazın; yazı boyu kalem kalınlığıyla değişir.
• Zemin: düz, kareli, yatay ya da dikey çizgili.
• İki silgi: dokunduğu yeri silen normal silgi ve bütün bir çizgiyi silen çizgi silgisi.
• Seç ve taşı: çizdiklerinizi seçip yerini değiştirin.
• Geri al ve yinele.
• Yakınlaştırma: iki parmakla yakınlaştırın ve kaydırın.
• Çizimler: çalışmanız kendiliğinden kaydedilir; son 30 çizim saklanır, önceki ve sonraki çizime tek dokunuşla geçilir.
• Sade araç çubuğu: telefonda sığmayan araçlar menüye geçer; çubuk çift dokunuşla katlanıp tahtayı boşaltır.
• Akıllı tahtada kalın kalemler ve büyük yazılar kendiliğinden seçilir.

Gizliliğiniz önce gelir
Çizimleriniz yalnızca cihazınızda saklanır; hiçbir şey internete ya da bir sunucuya gönderilmez.

Her yerde aynı uygulama
drAW'ın Linux (Pardus dahil) ve Windows sürümleri ile tarayıcıda çalışan web sürümü de vardır: madematik.com/drAW
Kardeşleri: drAW2D (2B geometri ve fonksiyon çizimi) ve drAW3D (3B geometri ve cisim açınımları).

drAW ücretsizdir. Öneri ve sorunlar için: destek@madematik.com
<!-- /tam -->

## Kategori ve iletişim

- **Uygulama mı, oyun mu:** Uygulama
- **Ücretli mi, ücretsiz mi:** Ücretsiz
- **Kategori:** Eğitim
- **Etiketler (öneri):** Eğitim, Sanat ve tasarım, Verimlilik, Araçlar (Play'in listesinden en yakınları seçilir).
- **E-posta (herkese açık):** destek@madematik.com
- **Web sitesi:** https://madematik.com
- **Telefon:** boş bırakılır (isteğe bağlı).
- **Gizlilik politikası:** https://madematik.com/drAW/gizlilik.html (kaynağı `public/gizlilik.html`)

## Uygulama içeriği beyanları (öneri; awPDF'te verilen cevaplarla aynı mantık)

- **Veri güvenliği:** Veri toplanmıyor, paylaşılmıyor. Paket yalnız Capacitor'ın standart internet iznini taşır;
  uygulama ağa veri göndermez (yalnız Hakkında'daki bağlantılar tarayıcıda açılır).
- **Reklam:** Reklam yok.
- **Uygulama erişimi:** Bütün işlevler herhangi bir giriş olmadan kullanılabilir.
- **İçerik derecelendirmesi:** Anket "eğitim / araç" uygulaması olarak doldurulur; şiddet, kumar, kullanıcılar arası
  iletişim yok.
- **Hedef kitle:** awPDF'te seçilenle aynı yaş grupları.
- **Satıcı statüsü:** Hesap düzeyinde "tacir değil" olarak zaten beyan edildi (2026-11-07, awPDF).
- **Yapay zekâ beyanı:** awPDF'te seçilenle aynı.

## Sürüm notları ("Bu sürümdeki yenilikler", en çok 500 karakter)

Play Console'da sürüm oluşturulurken `<tr-TR>` ile `</tr-TR>` arasına yazılır. En yenisi üstte.

### 0.0.10

<!-- not-0.0.10 -->
Google Play'deki ilk sürüm. Kalem, fosforlu kalem, iki silgi, şekiller, metin ve kareli ya da çizgili zemin; çizimler kendiliğinden kaydedilir. Akıllı tahtada, tablette ve telefonda ders anlatmak için tasarlandı. Reklam yok, hiçbir veri toplanmaz.
<!-- /not-0.0.10 -->

## Görseller (`docs/play/`)

| Play alanı | Dosya | Ölçü |
|---|---|---|
| Uygulama simgesi | `simge-512.png` | 512×512 |
| Öne çıkan görsel | `one-cikan-1024x500.png` | 1024×500 |
| Telefon ekran görüntüleri | `ekran/telefon-1…2-*.png` | 1080×2160 |
| 7 inç tablet ekran görüntüleri | `ekran/tablet7-1…2-*.png` | 1200×1920 |
| 10 inç tablet ekran görüntüleri | `ekran/tablet10-1…2-*.png` | 2560×1600 |

Ekran görüntülerindeki çizim betiğin kendi çizdiği örnek bir derstir (`scripts/play/gorseller.mjs`); kullanıcının
çizimleri kullanılmaz.
