import path from "node:path";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import type { BrowserWindow as ElectronBrowserWindow, Display, NativeImage, WebContents } from "electron";

const electron = createRequire(import.meta.url)("electron") as typeof import("electron");
const { BrowserWindow, nativeImage, screen } = electron;
const executeFile = promisify(execFile);

type SelectionPayload = {
    x: number;
    y: number;
    width: number;
    height: number;
    renderedWidth: number;
    renderedHeight: number;
};

export type ScreenCaptureResult = {
    dataUrl: string;
    width: number;
    height: number;
};

type CaptureSession = {
    owner: ElectronBrowserWindow;
    overlay: ElectronBrowserWindow;
    sourceWidth: number;
    sourceHeight: number;
    sourceImage: NativeImage;
    resolve: (result: ScreenCaptureResult | null) => void;
};

export class ScreenCaptureService {

    private activeSession: CaptureSession | null;
    private pendingOwner: WebContents | null;

    constructor() {

        this.activeSession = null;
        this.pendingOwner = null;

    }

    public async start(ownerContents: WebContents): Promise<ScreenCaptureResult | null> {

        if (this.activeSession !== null || this.pendingOwner !== null) {
            return null;
        }

        const owner = BrowserWindow.fromWebContents(ownerContents);

        if (owner === null) {
            return null;
        }

        this.pendingOwner = ownerContents;

        try {
            owner.minimize();
            await new Promise<void>((resolve) => setTimeout(resolve, 120));

            if (this.pendingOwner !== ownerContents) {
                this.restoreOwner(owner);

                return null;
            }

            const display = screen.getPrimaryDisplay();
            const sourceImage = await this.captureLinuxScreen();

            if (this.pendingOwner !== ownerContents) {
                this.restoreOwner(owner);

                return null;
            }

            if (sourceImage.isEmpty()) {
                this.pendingOwner = null;
                this.restoreOwner(owner);

                return null;
            }

            this.pendingOwner = null;

            return await this.createSession(owner, display, sourceImage);
        } catch {
            this.pendingOwner = null;
            this.restoreOwner(owner);

            return null;
        }

    }

    private async captureLinuxScreen(): Promise<NativeImage> {

        const captureDirectory = await mkdtemp(path.join(tmpdir(), "draw-screen-"));
        const capturePath = path.join(captureDirectory, "capture.png");

        try {
            await executeFile("gnome-screenshot", ["-f", capturePath]);

            return nativeImage.createFromBuffer(await readFile(capturePath));
        } finally {
            await rm(captureDirectory, { recursive: true, force: true });
        }

    }

    private async createSession(
        owner: ElectronBrowserWindow,
        display: Display,
        sourceImage: NativeImage
    ): Promise<ScreenCaptureResult | null> {

        const sourceSize = sourceImage.getSize();
        const overlay = new BrowserWindow({
            x: display.bounds.x,
            y: display.bounds.y,
            width: display.bounds.width,
            height: display.bounds.height,
            frame: false,
            fullscreen: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizable: false,
            movable: false,
            backgroundColor: "#000000",
            webPreferences: {
                preload: path.join(process.cwd(), "electron", "overlay-preload.cjs"),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        await overlay.loadFile(path.join(process.cwd(), "electron", "overlay.html"));
        overlay.show();
        overlay.focus();

        return new Promise<ScreenCaptureResult | null>((resolve) => {
            const session: CaptureSession = {
                owner,
                overlay,
                sourceWidth: sourceSize.width,
                sourceHeight: sourceSize.height,
                sourceImage,
                resolve
            };

            this.activeSession = session;
            overlay.once("closed", () => this.cancelSession(session));
            overlay.webContents.send("screen-capture:source", {
                dataUrl: sourceImage.toDataURL()
            });
        });

    }

    public complete(sender: WebContents, selection: SelectionPayload): void {

        const session = this.activeSession;

        if (session === null || sender !== session.overlay.webContents) {
            return;
        }

        if (!this.isValidSelection(selection)) {
            this.finishSession(session, null);

            return;
        }

        const x = Math.max(0, Math.round(selection.x * session.sourceWidth / selection.renderedWidth));
        const y = Math.max(0, Math.round(selection.y * session.sourceHeight / selection.renderedHeight));
        const width = Math.min(
            session.sourceWidth - x,
            Math.max(1, Math.round(selection.width * session.sourceWidth / selection.renderedWidth))
        );
        const height = Math.min(
            session.sourceHeight - y,
            Math.max(1, Math.round(selection.height * session.sourceHeight / selection.renderedHeight))
        );
        const crop = session.sourceImage.crop({ x, y, width, height });

        if (crop.isEmpty()) {
            this.finishSession(session, null);

            return;
        }

        this.finishSession(session, {
            dataUrl: crop.toDataURL(),
            width: selection.width,
            height: selection.height
        });

    }

    public cancel(sender: WebContents): void {

        const session = this.activeSession;

        if (this.pendingOwner === sender) {
            this.pendingOwner = null;
            const owner = BrowserWindow.fromWebContents(sender);

            if (owner !== null) {
                this.restoreOwner(owner);
            }

            return;
        }

        if (session !== null && (sender === session.owner.webContents || sender === session.overlay.webContents)) {
            this.finishSession(session, null);
        }

    }

    private cancelSession(session: CaptureSession): void {

        if (this.activeSession === session) {
            this.finishSession(session, null);
        }

    }

    private isValidSelection(selection: SelectionPayload): boolean {

        return Number.isFinite(selection.x) && Number.isFinite(selection.y) &&
            Number.isFinite(selection.width) && Number.isFinite(selection.height) &&
            Number.isFinite(selection.renderedWidth) && Number.isFinite(selection.renderedHeight) &&
            selection.width > 0 && selection.height > 0 &&
            selection.renderedWidth > 0 && selection.renderedHeight > 0;

    }

    private finishSession(session: CaptureSession, result: ScreenCaptureResult | null): void {

        if (this.activeSession !== session) {
            return;
        }

        this.activeSession = null;

        if (!session.overlay.isDestroyed()) {
            this.restoreOwner(session.owner);
            session.overlay.once("closed", () => {
                this.restoreOwner(session.owner);
                session.resolve(result);
            });
            session.overlay.close();

            return;
        }

        this.restoreOwner(session.owner);
        session.resolve(result);

    }

    private restoreOwner(owner: ElectronBrowserWindow): void {

        if (owner.isDestroyed()) {
            return;
        }

        owner.restore();
        owner.setAlwaysOnTop(true, "screen-saver");
        owner.show();
        owner.moveTop();
        owner.focus();
        setTimeout(() => {
            if (!owner.isDestroyed()) {
                owner.setAlwaysOnTop(false);
            }
        }, 250);

    }

}
