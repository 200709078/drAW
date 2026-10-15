import path from "node:path";
import { createRequire } from "node:module";
import type { BrowserWindow as WindowType, IpcMain, IpcMainInvokeEvent, NativeImage } from "electron";
import type { CaptureMode, CaptureReply } from "../../src/capture/QuickCaptureBridge.ts";
import { pixelSelection } from "./geometry.ts";

const { BrowserWindow, desktopCapturer, nativeImage, screen } = createRequire(import.meta.url)("electron") as typeof import("electron");

type CaptureSession = {
    owner: WindowType;
    overlay: WindowType | null;
    image: NativeImage | null;
    width: number;
    height: number;
    initialized: boolean;
    shown: boolean;
    prepared: () => void;
    finish: (reply: CaptureReply) => void;
};

export class QuickCaptureService {
    private active: CaptureSession | null = null;
    private readonly allowed = new Set<number>();
    private readonly directory: string;

    constructor(directory: string) { this.directory = directory; }

    public allowWindow(window: WindowType): void {
        const id = window.webContents.id;
        this.allowed.add(id);
        window.once("closed", () => this.allowed.delete(id));
    }

    public register(ipc: IpcMain): void {
        ipc.handle("quick-capture:take", (event, mode: unknown) => this.take(event, mode));
        ipc.on("quick-capture:cancel", (event) => {
            if (this.active?.owner.webContents === event.sender && event.senderFrame === event.sender.mainFrame) {
                this.active.finish({ status: "cancelled" });
            }
        });
        ipc.on("quick-capture:ready", (event) => {
            const session = this.fromOverlay(event);
            if (!session || !session.image || session.initialized) return;
            session.initialized = true;
            event.sender.send("quick-capture:image", session.image.toDataURL());
        });
        ipc.on("quick-capture:shown", (event) => {
            const session = this.fromOverlay(event);
            if (!session || !session.initialized || session.shown) return;
            session.shown = true;
            session.prepared();
            session.overlay!.show();
            session.overlay!.focus();
        });
        ipc.on("quick-capture:selection", (event, value: unknown) => {
            const session = this.fromOverlay(event);
            if (!session?.image || !session.shown) return;
            const rect = pixelSelection(value, session.width, session.height);
            if (!rect) return;
            try {
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

    private fromOverlay(event: { sender: Electron.WebContents; senderFrame: Electron.WebFrameMain | null }): CaptureSession | null {
        return this.active?.overlay?.webContents === event.sender && event.senderFrame === event.sender.mainFrame
            ? this.active : null;
    }

    private take(event: IpcMainInvokeEvent, mode: unknown): Promise<CaptureReply> {
        const owner = BrowserWindow.fromWebContents(event.sender);
        if (!owner || !this.allowed.has(event.sender.id) || event.senderFrame !== event.sender.mainFrame ||
            (mode !== "screen" && mode !== "area") || !["win32", "linux"].includes(process.platform)) {
            return Promise.resolve({ status: "error", message: "Alıntı yalnızca masaüstü uygulamasında kullanılabilir." });
        }
        if (this.active) return Promise.resolve({ status: "cancelled" });

        return new Promise<CaptureReply>((resolve) => {
            const wasVisible = owner.isVisible();
            const session: CaptureSession = {
                owner, overlay: null, image: null, width: 0, height: 0, initialized: false, shown: false,
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
                    if (session.overlay && !session.overlay.isDestroyed()) session.overlay.destroy();
                    session.image = null;
                    if (!owner.isDestroyed() && wasVisible) { owner.show(); owner.focus(); }
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
            void this.prepare(session, mode).catch((error: unknown) => {
                session.finish({ status: "error", message: error instanceof Error
                    ? error.message : "Ekran görüntüsü alınamadı. Yeniden deneyin." });
            });
        });
    }

    private async prepare(session: CaptureSession, mode: CaptureMode): Promise<void> {
        const display = screen.getDisplayMatching(session.owner.getBounds());
        const width = Math.round(display.bounds.width * display.scaleFactor);
        const height = Math.round(display.bounds.height * display.scaleFactor);
        session.owner.hide();
        // Pencere yöneticisinin drAW'ı ekrandan kaldırdığı karenin tamamlanmasını bekle.
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (this.active !== session) return;
        let sources: Electron.DesktopCapturerSource[];
        try {
            sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width, height } });
        } catch {
            throw new Error("Ekran görüntüsüne erişilemedi. Sistem ekran paylaşım iznini kontrol edin.");
        }
        if (this.active !== session) return;
        let source = sources.find((item) => item.display_id === String(display.id));
        if (!source && process.platform === "linux" && Number.isSafeInteger(display.id) && display.id > 0xffffffff) {
            // Electron'un X11 yakalayıcısı 64 bit ekran kimliğini uint32 olarak döndürebiliyor.
            // Tam kimlik önceliklidir; kısaltılmış kimlik yalnız tek kaynakla eşleşirse kullanılır.
            // https://github.com/electron/electron/blob/v43.2.0/shell/browser/api/electron_api_desktop_capturer.cc
            const matches = sources.filter((item) => item.display_id === String(display.id >>> 0));
            if (matches.length === 1) source = matches[0];
        }
        source ??= sources.length === 1 && !sources[0].display_id ? sources[0] : undefined;
        if (!sources.length) throw new Error("Ekran görüntüsü kaynağı bulunamadı. Ekran paylaşım iznini kontrol edip yeniden deneyin.");
        if (!source) throw new Error("drAW'ın bulunduğu ekran, görüntü kaynağıyla eşleştirilemedi. Yeniden deneyin.");
        if (source.thumbnail.isEmpty()) throw new Error("Ekran görüntüsü boş geldi. Yeniden deneyin.");
        // PNG'yi yeniden açarak NativeImage'ın DPI gösterimlerini tek fiziksel piksel uzayına indir.
        const image = nativeImage.createFromBuffer(source.thumbnail.toPNG());
        const size = image.getSize();
        if (image.isEmpty() || size.width !== width || size.height !== height) {
            throw new Error("Ekran görüntüsü özgün çözünürlükte alınamadı. drAW'ın bulunduğu ekranı seçip yeniden deneyin.");
        }
        session.image = image;
        session.width = size.width;
        session.height = size.height;
        if (mode === "screen") {
            session.finish({ status: "ok", image: { dataUrl: image.toDataURL(), ...size } });
            return;
        }
        const overlay = new BrowserWindow({
            ...display.bounds, show: false, frame: false, fullscreen: true,
            // Linux pencere yöneticisi tam ekrana geçerken boyutlandırabilmeli.
            alwaysOnTop: true, skipTaskbar: true, resizable: process.platform === "linux", movable: false,
            minimizable: false, maximizable: false, autoHideMenuBar: true, backgroundColor: "#ffffff",
            webPreferences: {
                preload: path.join(this.directory, "selection.cjs"),
                contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false
            }
        });
        session.overlay = overlay;
        overlay.setMenu(null);
        overlay.setAlwaysOnTop(true, "screen-saver");
        overlay.once("closed", () => session.finish({ status: "cancelled" }));
        overlay.on("blur", () => {
            if (session.shown) session.finish({ status: "cancelled" });
        });
        overlay.webContents.once("render-process-gone", () => session.finish({
            status: "error", message: "Seçim ekranı kapandı. Yeniden deneyin."
        }));
        overlay.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
        overlay.webContents.on("will-navigate", (event) => event.preventDefault());
        await overlay.loadFile(path.join(this.directory, "selection.html"));
    }
}
