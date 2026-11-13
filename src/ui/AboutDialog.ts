import { Capacitor } from "@capacitor/core";

// Hakkında penceresi (ailenin ortak penceresi: drAW2D, drAW3D, awPDF, awCELL'de de var). Uygulamanın öteki
// pencereleri gibi .modal yapısındadır; bu yüzden Android geri tuşu da kapatır (Application, .modal__close).
// Kapanma: ×, Esc, dışarıya dokunma. Bağlantılar sistemin tarayıcısında açılır: masaüstünde Electron'un
// pencere açma yakalayıcısı, Android'de uygulama dışına giden gezinme tarayıcıya gider.
// Yer (2026-11-13, kullanıcı kararı): telefonda ☰ menüsünün en sonu, PC ve tahtada çizimler panelinin başlığı.

export const ABOUT_ICON = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"`,
    ` stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`,
    `<circle cx="12" cy="12" r="9"/>`,
    `<path d="M12 11v6"/>`,
    `<path d="M12 7.5h.01"/>`,
    `</svg>`
].join("");

const DOWNLOAD_URL = "https://madematik.com/projelerim/draw#indirmeler";

let openBackdrop: HTMLDivElement | null = null;

export function isAboutDialogOpen(): boolean {

    return openBackdrop !== null;

}

export function openAboutDialog(): void {

    if (openBackdrop !== null) {
        return;
    }

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";

    const dialog = document.createElement("div");
    dialog.className = "modal about";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "about-title");

    const titlebar = document.createElement("div");
    titlebar.className = "modal__titlebar";
    const title = document.createElement("h2");
    title.className = "modal__title";
    title.id = "about-title";
    title.textContent = "drAW Hakkında";
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "modal__close";
    closeButton.setAttribute("aria-label", "Kapat");
    closeButton.title = "Kapat";
    closeButton.textContent = "×";
    titlebar.append(title, closeButton);

    const body = document.createElement("div");
    body.className = "about__body";
    body.innerHTML = [
        `<img class="about__icon" src="./img/app-icon.png" width="72" height="72" alt="">`,
        `<p class="about__name"><strong>drAW</strong> <span>sürüm ${__APP_VERSION__}</span></p>`,
        `<p class="about__description">Etkileşimli tahta ve çizim uygulaması</p>`,
        `<p class="about__maker"><a href="https://madematik.com" target="_blank" rel="noopener noreferrer">`,
        `<span class="about__brand">m<span>ADEM</span>atik Solutions</span><br>madematik.com</a></p>`,
        `<dl class="about__facts">`,
        `<dt>İndir</dt><dd><a href="${DOWNLOAD_URL}" target="_blank" rel="noopener noreferrer">Linux · Windows · Android</a></dd>`,
        `<dt>Lisans</dt><dd>MIT</dd>`,
        // Adres seçilebilir düz yazı: e-posta bağlantıları tahtada ve telefonda çoğu zaman bir şey açmaz.
        `<dt>İletişim</dt><dd class="about__mail">ademvarol@madematik.com</dd>`,
        `</dl>`
    ].join("");

    dialog.append(titlebar, body);
    backdrop.append(dialog);

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const close = (): void => {
        if (openBackdrop !== backdrop) {
            return;
        }

        openBackdrop = null;
        document.removeEventListener("keydown", onKeyDown, true);
        backdrop.remove();
        previousFocus?.focus();
    };

    const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
        }
    };

    closeButton.addEventListener("click", close);
    backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) {
            close();
        }
    });
    document.addEventListener("keydown", onKeyDown, true);

    if (Capacitor.isNativePlatform()) {
        for (const link of body.querySelectorAll<HTMLAnchorElement>('a[href^="https://"]')) {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                window.location.assign(link.href);
            });
        }
    }

    openBackdrop = backdrop;
    document.body.append(backdrop);
    closeButton.focus();

}
