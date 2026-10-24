import path from "node:path";
import { createRequire } from "node:module";
import type { BrowserWindow as WindowType, Display, IpcMain, IpcMainEvent, IpcMainInvokeEvent, NativeImage, Rectangle } from "electron";
import type { CaptureMode, CaptureReply } from "../../src/capture/QuickCaptureBridge.ts";
import { pixelSelection, pngSize } from "./geometry.ts";

const { BrowserWindow, desktopCapturer, nativeImage, screen } = createRequire(import.meta.url)("electron") as typeof import("electron");

// Kamera paleti açılınca hazırlanan gizli seçim penceresi bu süre kullanılmazsa kapatılır.
const SPARE_LIFETIME = 60000;
const HIDE_SETTLE = 200;

type Overlay = {
    window: WindowType;
    displayId: number;
    bounds: Rectangle;
    loaded: Promise<boolean>;
};

type Spare = { owner: WindowType; overlay: Overlay; release: () => void };

type CaptureSession = {
    owner: WindowType;
    mode: CaptureMode;
    overlay: Overlay | null;
    png: Buffer | null;
    image: NativeImage | null;
    width: number;
    height: number;
    sent: boolean;
    shown: boolean;
    mark: (step: string) => void;
    prepared: () => void;
    finish: (reply: CaptureReply) => void;
};

export class QuickCaptureService {
    private active: CaptureSession | null = null;
    private spare: Spare | null = null;
    private readonly allowed = new Set<number>();
    private readonly directory: string;
    private readonly log: ((line: string) => void) | null;

    constructor(directory: string, log: ((line: string) => void) | null = null) {
        this.directory = directory;
        this.log = log;
    }

    public allowWindow(window: WindowType): void {
        const id = window.webContents.id;
        this.allowed.add(id);
        window.once("closed", () => this.allowed.delete(id));
    }

    public register(ipc: IpcMain): void {
        ipc.handle("quick-capture:take", (event, mode: unknown) => this.take(event, mode));
        ipc.on("quick-capture:prepare", (event) => {
            const owner = this.ownerOf(event);
            if (owner && !this.active && this.supported()) this.prepareSpare(owner);
        });
        ipc.on("quick-capture:cancel", (event) => {
            if (this.active?.owner.webContents === event.sender && event.senderFrame === event.sender.mainFrame) {
                this.active.finish({ status: "cancelled" });
            }
        });
        ipc.on("quick-capture:shown", (event) => {
            const session = this.fromOverlay(event);
            if (!session || !session.sent || session.shown) return;
            session.shown = true;
            session.mark("görünme");
            session.prepared();
            session.overlay!.window.show();
            session.overlay!.window.focus();
        });
        ipc.on("quick-capture:selection", (event, value: unknown) => {
            const session = this.fromOverlay(event);
            if (!session?.png || !session.shown) return;
            const rect = pixelSelection(value, session.width, session.height);
            if (!rect) return;
            try {
                session.image ??= nativeImage.createFromBuffer(session.png);
                const image = session.image.crop(rect);
                session.finish({ status: "ok", image: {
                    dataUrl: image.toDataURL(), width: rect.width, height: rect.height
                } });
            } catch {
                session.finish({ status: "error", message: "Seçilen alan alınamadı. Yeniden deneyin." });
            }
        });
        ipc.on("quick-capture:abort", (event) => this.fromOverlay(event)?.finish({ status: "cancelled" }));
        ipc.on("quick-capture:failed", (event) => this.fromOverlay(event)?.finish({
            status: "error", message: "Seçim ekranı hazırlanamadı. Yeniden deneyin."
        }));
    }

    private supported(): boolean {
        return process.platform === "win32" || process.platform === "linux";
    }

    private ownerOf(event: IpcMainEvent | IpcMainInvokeEvent): WindowType | null {
        if (!this.allowed.has(event.sender.id) || event.senderFrame !== event.sender.mainFrame) return null;
        return BrowserWindow.fromWebContents(event.sender);
    }

    private fromOverlay(event: { sender: Electron.WebContents; senderFrame: Electron.WebFrameMain | null }): CaptureSession | null {
        return this.active?.overlay?.window.webContents === event.sender && event.senderFrame === event.sender.mainFrame
            ? this.active : null;
    }

    private createOverlay(display: Display): Overlay {
        const window = new BrowserWindow({
            ...display.bounds, show: false, frame: false, fullscreen: true,
            // Linux pencere yöneticisi tam ekrana geçerken boyutlandırabilmeli.
            alwaysOnTop: true, skipTaskbar: true, resizable: process.platform === "linux", movable: false,
            minimizable: false, maximizable: false, autoHideMenuBar: true, backgroundColor: "#ffffff",
            webPreferences: {
                preload: path.join(this.directory, "selection.cjs"),
                contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false
            }
        });
        window.setMenu(null);
        window.setAlwaysOnTop(true, "screen-saver");
        window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
        window.webContents.on("will-navigate", (event) => event.preventDefault());
        // loadFile, önyükleme betiğinin görüntü dinleyicisini kurduğu DOMContentLoaded sonrasında tamamlanır.
        const loaded = window.loadFile(path.join(this.directory, "selection.html")).then(() => true, () => false);
        return { window, displayId: display.id, bounds: { ...display.bounds }, loaded };
    }

    private fits(overlay: Overlay, display: Display): boolean {
        const { x, y, width, height } = display.bounds;
        return !overlay.window.isDestroyed() && overlay.displayId === display.id && overlay.bounds.x === x &&
            overlay.bounds.y === y && overlay.bounds.width === width && overlay.bounds.height === height;
    }

    // Yeni pencere ve süreç açmak (özellikle Windows'ta) yavaştır; kullanıcı Alan'ı seçerken arka planda hazırlanır.
    private prepareSpare(owner: WindowType): void {
        const display = screen.getDisplayMatching(owner.getBounds());
        if (this.spare && (this.spare.owner !== owner || !this.fits(this.spare.overlay, display))) this.discardSpare();
        this.spare?.release();
        const overlay = this.spare?.overlay ?? this.createOverlay(display);
        const discard = () => { if (this.spare?.overlay === overlay) this.discardSpare(); };
        const timer = setTimeout(discard, SPARE_LIFETIME);
        overlay.window.once("closed", discard);
        overlay.window.webContents.once("render-process-gone", discard);
        owner.once("closed", discard);
        screen.on("display-metrics-changed", discard);
        screen.on("display-removed", discard);
        this.spare = { owner, overlay, release: () => {
            clearTimeout(timer);
            overlay.window.removeListener("closed", discard);
            overlay.window.webContents.removeListener("render-process-gone", discard);
            owner.removeListener("closed", discard);
            screen.removeListener("display-metrics-changed", discard);
            screen.removeListener("display-removed", discard);
        } };
    }

    private takeSpare(owner: WindowType, display: Display): Overlay | null {
        const spare = this.spare;
        if (!spare) return null;
        if (spare.owner !== owner || !this.fits(spare.overlay, display)) {
            this.discardSpare();
            return null;
        }
        this.spare = null;
        spare.release();
        return spare.overlay;
    }

    private discardSpare(): void {
        const spare = this.spare;
        if (!spare) return;
        this.spare = null;
        spare.release();
        if (!spare.overlay.window.isDestroyed()) spare.overlay.window.destroy();
    }

    private take(event: IpcMainInvokeEvent, mode: unknown): Promise<CaptureReply> {
        const owner = this.ownerOf(event);
        if (!owner || (mode !== "screen" && mode !== "area") || !this.supported()) {
            return Promise.resolve({ status: "error", message: "Alıntı yalnızca masaüstü uygulamasında kullanılabilir." });
        }
        if (this.active) return Promise.resolve({ status: "cancelled" });

        return new Promise<CaptureReply>((resolve) => {
            const wasVisible = owner.isVisible();
            const started = performance.now();
            const marks: string[] = [];
            const session: CaptureSession = {
                owner, mode, overlay: null, png: null, image: null, width: 0, height: 0, sent: false, shown: false,
                mark: (step) => marks.push(`${step}=${Math.round(performance.now() - started)}ms`),
                prepared: () => clearTimeout(timer),
                finish: (reply) => {
                    if (this.active !== session) return;
                    this.active = null;
                    clearTimeout(timer);
                    owner.removeListener("closed", cancelled);
                    owner.webContents.removeListener("render-process-gone", cancelled);
                    owner.webContents.removeListener("did-start-navigation", navigating);
                    screen.removeListener("display-metrics-changed", cancelled);
                    screen.removeListener("display-removed", cancelled);
                    if (session.overlay && !session.overlay.window.isDestroyed()) session.overlay.window.destroy();
                    session.png = null;
                    session.image = null;
                    if (!owner.isDestroyed() && wasVisible) { owner.show(); owner.focus(); }
                    session.mark(reply.status === "ok" ? "bitti" : reply.status === "cancelled" ? "iptal" : "hata");
                    this.log?.(`${new Date().toISOString()} ${process.platform} ${mode} ${session.width}x${session.height} ${marks.join(" ")}`);
                    resolve(reply);
                }
            };
            const cancelled = () => session.finish({ status: "cancelled" });
            const navigating = (_event: unknown, _url: string, _inPlace: boolean, mainFrame: boolean) => {
                if (mainFrame) cancelled();
            };
            const timer = setTimeout(() => session.finish({
                status: "error", message: "Ekran görüntüsü zamanında alınamadı. Ekran paylaşım iznini kontrol edip yeniden deneyin."
            }), 30000);
            this.active = session;
            owner.once("closed", cancelled);
            owner.webContents.once("render-process-gone", cancelled);
            owner.webContents.on("did-start-navigation", navigating);
            screen.on("display-metrics-changed", cancelled);
            screen.on("display-removed", cancelled);
            void this.prepare(session).catch((error: unknown) => {
                session.finish({ status: "error", message: error instanceof Error
                    ? error.message : "Ekran görüntüsü alınamadı. Yeniden deneyin." });
            });
        });
    }

    private async prepare(session: CaptureSession): Promise<void> {
        const display = screen.getDisplayMatching(session.owner.getBounds());
        const width = Math.round(display.bounds.width * display.scaleFactor);
        const height = Math.round(display.bounds.height * display.scaleFactor);
        const hidden = performance.now();
        session.owner.hide();
        if (session.mode === "area") {
            // Gizli seçim penceresi ekran görüntüsünde yer almaz; yüklenmesi yakalamayla birlikte sürer.
            const reused = this.takeSpare(session.owner, display);
            session.overlay = reused ?? this.createOverlay(display);
            session.mark(reused ? "hazır-pencere" : "yeni-pencere");
            this.watchOverlay(session, session.overlay.window);
        }
        // Pencere yöneticisinin drAW'ı ekrandan kaldırdığı karenin tamamlanmasını bekle.
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, HIDE_SETTLE - (performance.now() - hidden))));
        if (this.active !== session) return;
        let sources: Electron.DesktopCapturerSource[];
        try {
            sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width, height } });
        } catch {
            throw new Error("Ekran görüntüsüne erişilemedi. Sistem ekran paylaşım iznini kontrol edin.");
        }
        if (this.active !== session) return;
        session.mark("kaynak");
        let source = sources.find((item) => item.display_id === String(display.id));
        if (!source && process.platform === "linux" && Number.isSafeInteger(display.id) && display.id > 0xffffffff) {
            // Electron'un X11 yakalayıcısı 64 bit ekran kimliğini uint32 olarak döndürebiliyor.
            // Tam kimlik önceliklidir; kısaltılmış kimlik yalnız tek kaynakla eşleşirse kullanılır.
            // https://github.com/electron/electron/blob/v43.2.0/shell/browser/api/electron_api_desktop_capturer.cc
            const matches = sources.filter((item) => item.display_id === String(display.id >>> 0));
            if (matches.length === 1) source = matches[0];
        }
        if (!source && process.platform === "linux" && sources.length === 1) {
            // Bazı Linux sürücülerinde iki API tamamen farklı ekran kimlikleri verir.
            // Tek ekran ve tek kaynak varsa hedef belirlidir; özgün piksel ölçüsü aşağıda doğrulanır.
            const displays = screen.getAllDisplays();
            if (displays.length === 1 && displays[0].id === display.id) source = sources[0];
        }
        source ??= sources.length === 1 && !sources[0].display_id ? sources[0] : undefined;
        if (!sources.length) throw new Error("Ekran görüntüsü kaynağı bulunamadı. Ekran paylaşım iznini kontrol edip yeniden deneyin.");
        if (!source) throw new Error("drAW'ın bulunduğu ekran, görüntü kaynağıyla eşleştirilemedi. Yeniden deneyin.");
        if (source.thumbnail.isEmpty()) throw new Error("Ekran görüntüsü boş geldi. Yeniden deneyin.");
        // toPNG, NativeImage'ın DPI gösterimlerinden 1x olanı tek fiziksel piksel uzayında verir.
        // Bu PNG hem sonuç hem seçim ekranı için doğrudan kullanılır; yeniden kodlanmaz.
        const png = source.thumbnail.toPNG();
        const size = pngSize(png);
        if (!size || size.width !== width || size.height !== height) {
            throw new Error("Ekran görüntüsü özgün çözünürlükte alınamadı. drAW'ın bulunduğu ekranı seçip yeniden deneyin.");
        }
        session.mark("png");
        session.png = png;
        session.width = size.width;
        session.height = size.height;
        if (session.mode === "screen") {
            session.finish({ status: "ok", image: { dataUrl: `data:image/png;base64,${png.toString("base64")}`, ...size } });
            return;
        }
        const overlay = session.overlay!;
        if (!await overlay.loaded) throw new Error("Seçim ekranı hazırlanamadı. Yeniden deneyin.");
        if (this.active !== session) return;
        session.mark("yüklendi");
        session.sent = true;
        overlay.window.webContents.send("quick-capture:image", png);
    }

    private watchOverlay(session: CaptureSession, window: WindowType): void {
        window.once("closed", () => session.finish({ status: "cancelled" }));
        window.on("blur", () => {
            if (session.shown) session.finish({ status: "cancelled" });
        });
        window.webContents.once("render-process-gone", () => session.finish({
            status: "error", message: "Seçim ekranı kapandı. Yeniden deneyin."
        }));
    }
}
