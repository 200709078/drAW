package com.madematik.draw;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

// drAW'da dosya açma/kaydetme yok; çizimler uygulamanın kendi deposunda (IndexedDB) kalır.
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // WebView, Android'in yazı boyutu ayarını (ör. 1,5×) sayfadaki bütün yazılara uygular:
        // düğme yazıları taşar, metin aracının düzenleme kutusu tuvale çizilen yazıdan büyük
        // görünür. Çizimde boyutlar ekrandakiyle birebir olmalı, bu yüzden yazı ölçeği sabit.
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
