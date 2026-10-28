# Akıllı tahta test notları

## 28 Ekim 2026 — Yol 1: dizüstü bilgisayar HDMI ile, 1920×1080

Tahta, Pardus 25 dizüstünün ikinci ekranı (HDMI-1, 1920×1080). Uygulama tahta ekranında
Chrome'da, güncel kodla (`npm run dev`, `?tahta=1`) açıldı; kullanıcı fareyle denedi ve
sınıfın arkasından baktı. Gözlemler kullanıcınındır.

- **Kalem kalınlıkları:** "Çizgiler çok kalın bile." Tahta modu `SMARTBOARD_LINE_WIDTHS`
  24–90 px, varsayılan 42. Dikkat: bu düzende tahta 1920×1080 görüntü alıyor; tahtanın kendi
  bilgisayarı 4K çalışıyorsa aynı çizgi orada fiziksel olarak yarı kalınlıktadır. Bkz.
  yol haritası "Tahta modu kalem kalınlıkları".
- **Palet renkleri:** iyi (24 Ekim'de koyulaştırılan sarı ve yeşil dahil).
- **Kılavuz çizgileri:** iyi.
- **Metin yazı boyutları:** iyi.
- **Dokunmatik bu düzende çalışmadı:** tahtanın dokunmatik USB çıkışı (tek USB-B girişi)
  bilgisayarda `2621:4501` kimliğiyle, HID değil "Vendor Specific" sınıfında görünüyor
  (64 baytlık kesme paketleri); Linux sürücü bağlamıyor. Tahtanın menüsünde dokunmatik
  kipi ayarı yok (yalnız ses, parlaklık, HDMI-VGA, güç). Dokunma testleri tahtanın kendi
  bilgisayarında (Yol 2, Yol 3) yapılacak.
- **Ekran alıntısı (masaüstü sürüm, drAW tahta ekranındayken):** kullanıcı alıntı aracının
  ikinci ekranla sorun çıkardığını bildirdi ("normalde çalışıyordu"). Günlükte
  (`~/.config/drAW/logs/quick-capture.log`) `area 0x0 hazır-pencere=5ms kaynak=349ms hata=401ms`:
  görüntü kaynakları geldi, ama drAW'ın ekranına ait kaynak bulunamadı ya da ölçüsü tutmadı.
  Yanlış ekranın görüntüsü eklenmedi; işlem hata vererek durdu. Dizüstü tek başına:
  ekran kimliği 64 bit, kaynak kimliği kısaltılmış (`65`), bu eşleşme çalışıyor.
  **Uygulandı (28 Ekim, tahta bağlı değilken):** Linux'ta her ekrana bir kaynak düşüyorsa öbür
  ekranların kaynakları elenir; tek bir "bütün masaüstü" kaynağı gelirse masaüstü özgün
  ölçüsünde yeniden alınıp drAW'ın ekranı ondan kesilir; eşleşme yine olmazsa günlüğe ekranların
  ve kaynakların kimlikleri, konumları ve ölçüleri yazılır. **Tahtada doğrulanacak:** sorun
  sürerse günlüğün son satırı gerekli.
- **Düzeltildi:** sayfa `lang="en"` idi; Chrome Türkçe arayüzü çevirmeyi öneriyordu
  (`0725502`, canlıya bir sonraki yayınla çıkar).

## 16 Ekim 2026 — Pardus ETAP, tek ekran

Kullanıcı fiziksel tahtadaki temel testleri tamamladı. Aşağıdaki test sonuçları
kullanıcı gözlemidir. Klavye düzeltmesi uygulandı; tahtada tekrar doğrulama
bekliyor. Beyaz ekran bulgusu için henüz değişiklik yapılmadı.

### Ekran alıntısı

- Kullanıcı son sürümü tahtaya yüklediğini bildirdi.
- **Bekleyen bulgu — Alan seçimine geçiş:** Beyaz ekran, Tam Ekran alıntısına
  göre belirgin biçimde daha uzun görünüyor. Süre ölçülmedi; nedeni henüz
  doğrulanmadı. Geçişteki beyaz ekranın azaltılması incelenecek.
- **24 Ekim 2026 — Uygulandı, tahtada doğrulama bekliyor:** Windows'ta Alan
  penceresinin 4–5 sn geç gelmesi bildirildi. Seçim penceresi artık kamera
  paleti açılınca gizli hazırlanıyor, görüntü bir kez kodlanıyor ve pencere
  görüntü boyanmadan gösterilmiyor. Bu değişiklik tahtadaki uzun beyaz geçişi de
  kısaltabilir. Süreler `~/.config/drAW/logs/quick-capture.log` dosyasında.
- Kullanıcı ekran alıntısında başka sorun olmadığını bildirdi. Önceki
  ekran eşleştirme hatasının tekrarladığına ilişkin bildirim yok.

### Metin ve ekran klavyesi

- **İlk bulgu — Klavye açılmıyor:** Metin eklerken veya mevcut metni
  düzenlemeye çalışırken ekran klavyesi otomatik açılmıyor. Kullanıcı
  drAW'ı tam ekrandan çıkarıp klavyeyi elle açmak zorunda kalıyor.
- Beklenen: Tahtada metin girişine geçince ekran klavyesi tam ekran
  kullanımında da erişilebilir olmalı.
- Kullanıcı klavyenin fotoğrafını çektiğini ve adının **ETA Klavye**
  olabileceğini belirtti. Uygulama adı henüz doğrulanmadı; fotoğraf
  henüz paylaşılmadı veya incelenmedi.
- **Uygulandı — Tahtada tekrar doğrulama bekliyor:** Metin editörü yalnızca
  textarea'ya odaklanıyordu. Linux tahta modunda sistem klavyesini açan masaüstü
  bağlantısı eklendi. Çalışan ETA Klavye veya Onboard önceliklidir; yoksa kurulu
  olan başlatılır. Klavye adı henüz kesinleşmediği için iki arayüz desteklendi.
- Metin bitirilince klavye gizlenir; araç/Yeni Çizim değişimi sırasında geciken
  istekler temizlenir. Hata metni silmez veya editörü kapatmaz; yazıya yeniden
  dokunmak açma isteğini yineler. Paket hazırlanmadı.
- Yerel doğrulama: 22 klavye servis testi, 55 metin arayüzü kontrolü, toplam
  252 Node testi, üretim derlemesi ve Electron tip kontrolü geçti. Gerçek
  Electron ve ayrı D-Bus oturumunda taklit ETA/Onboard servisleriyle sistem
  çağrıları, tam ekran ve metin odağı doğrulandı. Gerçek ETA/Onboard penceresinin
  fiziksel tahta üzerindeki görünümü henüz sınanmadı.
- Tahtada tekrar kontrol: Tam ekranda yeni metin ekleme ve mevcut metne çift
  dokunarak düzenleme sırasında klavye açılmalı; Türkçe yazılabilmeli. Kaleme
  veya Yeni Çizim'e geçince editör/klavye kapanmalı ve sonradan açılmamalı.
- Kullanıcının isteğiyle klavye düzeltmesinden sonra durulacak; beyaz ekran
  geçişi bu çalışmada ele alınmadı.

### Kılavuz

- Kullanıcı kılavuz düğmesini önceden gizlediğini ve şu an bu özelliğe
  ihtiyaç olmadığını belirtti. Kılavuz kontrolü test kapsamından çıkarıldı;
  düğmenin yeniden gösterilmesi istenmedi.
- **24 Ekim 2026:** Kullanıcının isteğiyle kılavuz paleti yeniden gösteriliyor;
  tahtada görünürlük ve palet konumu yeniden kontrol edilmeli.

### Tamamlanan kontroller

Kullanıcı, kendisine iletilen son dört kontrolde sorun olmadığını bildirdi:

1. **Normal silgi:** İnce ve kalın çizgileri silme, silinen alanın göstergeyle
   örtüşmesi ve silgi boyutunun kullanım rahatlığı.
2. **Metinden çıkış:** Klavyeyi elle açıp metin yazdıktan sonra kaleme geçerek
   çizme; Yeni Çizim'de eski metin veya düzenleme kutusunun kalmaması.
3. **Geri al / yinele:** Çizgi çizme, silme ve ekran alıntısı ekleme işlemlerinin
   sırayla geri alınması ve yinelenmesi.
4. **Kaydet / yeniden aç:** Metin, çizgi ve ekran alıntısı içeren çizimi kaydedip
   başka çizime geçtikten sonra yeniden açma; içerik ve yerleşimin korunması.

Bu sonuçlar ekran klavyesinin otomatik açılmaması bulgusunu kapatmıyor;
metinden çıkış kontrolü klavye elle açılarak yapıldı. Temel testler tamamlandı.
