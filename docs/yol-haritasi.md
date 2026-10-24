# drAW yol haritası

Bekleyen işler, kullanıcı istekleri ve fiziksel tahtada doğrulanacaklar. Bir madde
kullanıcı açıkça istemeden uygulanmaz. Yeni istekler tarihle eklenir.

## Kullanıcı kararı / isteği bekleyenler

- **Avuçla silme (24 Ekim 2026, beklemede):** Silgi seçmeden avuçla silme. Plan:
  büyük temas (ör. >3 cm, `PointerEvent.width/height`) temas süresince geniş silgi
  gibi çalışır, bırakınca önceki araca dönülür. Tahtanın temas boyutu bildirmesine
  bağlı; önce tahtada parmak/avuç/iki parmak temas boyutları günlüğe yazılıp
  ölçülmeli. Avucun birden çok nokta gibi gelmesi iki parmakla yakınlaştırmayla
  karışmamalı. Tahta boyut bildirmiyorsa güvenilir yol yok.
- **Palet renkleri (24 Ekim 2026):** Saf sarı (`#ffff00`) ve saf yeşil (`#00ff00`)
  beyaz zeminde zayıf; koyu tonlar önerildi, kullanıcı cevap vermedi.
- **Geliştirme önerileri (24 Ekim 2026):**
  - GitHub Actions: her push'ta `npm run typecheck` + `npm test`; Windows
    runner'da `.exe` otomatik üretimi (Windows makinesi gerekmez).
  - Tek test komutu: tarayıcı testleri elle Vite başlatmayı gerektiriyor;
    etiket değişikliklerinden sonra `storage-ui` ve `quick-capture-ui` sessizce
    bozulmuştu. drAW2D/3D gibi Playwright ile `npm test` her şeyi çalıştırmalı.
  - Çizim gecikmesi için önce tahtada kare süresi ölçümü, sonra optimizasyon.
  - `ToolbarPanel.ts` bölünmeli; renk kontrolü ayrı modüle alınabilir.

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
