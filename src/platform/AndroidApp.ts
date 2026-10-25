import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

// Android uygulaması (Capacitor) içinde mi; tarayıcı ve Electron'da false.
export function isAndroidApp(): boolean {

    return Capacitor.getPlatform() === "android";

}

export type AndroidHandlers = {
    // Açık pencere, metin düzenleyici, palet ya da paneli kapatır; açık bir şey yoksa false.
    back: () => boolean;
    // Uygulama arka plana geçti (sistem kapatabilir).
    pause: () => void;
};

// Geri tuşu önce açık olanı kapatır, sonra uygulamayı arka plana alır (ana ekran tuşu gibi,
// durum korunur). Arka plana geçerken çizim kaydedilir. drAW'da dosya açma/kaydetme yoktur.
export function bindAndroid(handlers: AndroidHandlers): void {

    if (!isAndroidApp()) {
        return;
    }

    void App.addListener("backButton", () => {
        if (!handlers.back()) {
            void App.minimizeApp();
        }
    });
    void App.addListener("pause", () => handlers.pause());

}
