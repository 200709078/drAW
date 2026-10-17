# Akıllı tahta test notları

## 16 Ekim 2026 — Pardus ETAP, tek ekran

Kullanıcı fiziksel tahtadaki temel testleri tamamladı. Aşağıdaki test sonuçları
kullanıcı gözlemidir. Klavye düzeltmesi uygulandı; tahtada tekrar doğrulama
bekliyor. Beyaz ekran bulgusu için henüz değişiklik yapılmadı.

### Ekran alıntısı

- Kullanıcı son sürümü tahtaya yüklediğini bildirdi.
- **Bekleyen bulgu — Alan seçimine geçiş:** Beyaz ekran, Tam Ekran alıntısına
  göre belirgin biçimde daha uzun görünüyor. Süre ölçülmedi; nedeni henüz
  doğrulanmadı. Geçişteki beyaz ekranın azaltılması incelenecek.
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
