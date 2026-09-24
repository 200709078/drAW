import { Document } from "../document/Document";
import { DocumentImage } from "../document/DocumentImage";
import { DocumentRenderer } from "../renderers/DocumentRenderer";
import type { SelectionTool } from "../tools/SelectionTool";
import type { LinkedPhotoData } from "../types/electron-api";
import { confirmDialog } from "../ui/ConfirmDialog";

const STORAGE_KEY = "draw:photo-link";
const HOLDER_MARGIN = 16;

type StoredLink = {
    folderPath: string;
    fileName: string;
};

const ICON_LINK = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none"`,
    ` stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>`,
    `<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
    `</svg>`
].join("");

const ICON_UNLINK = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none"`,
    ` stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
    `<path d="m18.84 12.25 1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>`,
    `<path d="m5.17 11.75-1.72 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
    `<line x1="8" x2="8" y1="2" y2="5"/>`,
    `<line x1="2" x2="5" y1="8" y2="8"/>`,
    `<line x1="16" x2="16" y1="19" y2="22"/>`,
    `<line x1="19" x2="22" y1="16" y2="16"/>`,
    `</svg>`
].join("");

export class LinkedPhotoManager {

    private readonly drawingDocument: Document;
    private readonly documentRenderer: DocumentRenderer;

    private selectionTool: SelectionTool | null;
    private linkButton: HTMLButtonElement | null;

    private folderPath: string | null;
    private fileName: string | null;
    private holder: DocumentImage | null;
    private busy: boolean;
    private navState: { prev: boolean; next: boolean };

    constructor(
        drawingDocument: Document,
        documentRenderer: DocumentRenderer
    ) {

        this.drawingDocument = drawingDocument;
        this.documentRenderer = documentRenderer;
        this.selectionTool = null;
        this.linkButton = null;
        this.folderPath = null;
        this.fileName = null;
        this.holder = null;
        this.busy = false;
        this.navState = { prev: false, next: false };

    }

    public setSelectionTool(selectionTool: SelectionTool): void {

        this.selectionTool = selectionTool;

    }

    public isAvailable(): boolean {

        return window.drAWDesktop?.photoFolder !== undefined;

    }

    public isLinked(): boolean {

        return this.folderPath !== null && this.fileName !== null;

    }

    public attachButton(button: HTMLButtonElement): void {

        this.linkButton = button;
        button.addEventListener("click", () => {
            void this.toggle();
        });
        this.refreshButton();

    }

    public isLinkedHolder(candidate: unknown): boolean {

        return candidate instanceof DocumentImage &&
            this.holder !== null &&
            candidate === this.holder &&
            this.holderOnPage();

    }

    // direction: -1 önceki fotoğraf, +1 sonraki fotoğraf.
    public canStepPhoto(direction: 1 | -1): boolean {

        return direction === 1 ? this.navState.next : this.navState.prev;

    }

    public requestStepPhoto(direction: 1 | -1): void {

        void this.stepPhoto(direction);

    }

    public async restore(): Promise<void> {

        const stored = this.readStoredLink();

        if (stored === null || !this.isAvailable()) {
            return;
        }

        const files = await this.listPhotos(stored.folderPath);

        if (!files.includes(stored.fileName)) {
            this.clearStoredLink();

            return;
        }

        this.folderPath = stored.folderPath;
        this.fileName = stored.fileName;
        this.holder = null;
        await this.refreshNavState();
        this.refreshButton();

    }

    public async toggle(): Promise<void> {

        if (this.busy) {
            return;
        }

        if (this.isLinked()) {
            this.unlink();

            return;
        }

        await this.link();

    }

    // Yeni çizim öncesi çağrılır: bağı doğrular, sıradaki fotoğrafı
    // yükleyip döndürür. Bağ koptuysa null döner.
    public async prepareNewDrawing(): Promise<LinkedPhotoData | null> {

        if (!this.isLinked() || this.folderPath === null || this.fileName === null) {
            return null;
        }

        if (!this.holderOnPage()) {
            this.unlink();

            return null;
        }

        const files = await this.listPhotos(this.folderPath);
        const currentIndex = files.indexOf(this.fileName);

        if (currentIndex === -1) {
            this.unlink();
            await this.showInfo(
                "Fotoğraf bulunamadı",
                "Bağlı fotoğraf klasörde bulunamadığı için klasör bağı koparıldı."
            );

            return null;
        }

        const nextIndex = currentIndex + 1;

        if (nextIndex >= files.length) {
            this.unlink();

            return null;
        }

        const nextName = files[nextIndex];
        const photo = await this.readPhoto(this.folderPath, nextName);

        if (photo === null) {
            this.unlink();
            await this.showInfo(
                "Fotoğraf okunamadı",
                `"${nextName}" açılamadığı için klasör bağı koparıldı.`
            );

            return null;
        }

        this.fileName = nextName;
        this.writeStoredLink();
        await this.refreshNavState();

        return photo;

    }

    public placePreparedPhoto(photo: LinkedPhotoData): void {

        this.addHolder(photo, true);

    }

    private async link(): Promise<void> {

        const bridge = window.drAWDesktop?.photoFolder;

        if (bridge === undefined) {
            return;
        }

        this.busy = true;

        try {
            const selection = await bridge.selectPhoto();

            if (selection === null) {
                return;
            }

            const photo = await this.readPhoto(selection.folderPath, selection.fileName);

            if (photo === null) {
                await this.showInfo(
                    "Fotoğraf okunamadı",
                    `"${selection.fileName}" açılamadı.`
                );

                return;
            }

            this.folderPath = selection.folderPath;
            this.fileName = selection.fileName;
            this.writeStoredLink();
            this.addHolder(photo, true);
            await this.refreshNavState();
            this.selectionTool?.refreshOverlays();
            this.refreshButton();
        } finally {
            this.busy = false;
        }

    }

    private unlink(): void {

        this.folderPath = null;
        this.fileName = null;
        this.clearStoredLink();
        this.navState = { prev: false, next: false };
        this.refreshButton();

    }

    private async stepPhoto(direction: 1 | -1): Promise<void> {

        if (this.busy || !this.isLinked() || this.folderPath === null || this.fileName === null) {
            return;
        }

        if (!this.holderOnPage() || this.holder === null) {
            this.unlink();

            return;
        }

        this.busy = true;

        try {
            const files = await this.listPhotos(this.folderPath);
            const currentIndex = files.indexOf(this.fileName);

            if (currentIndex === -1) {
                this.unlink();
                await this.showInfo(
                    "Fotoğraf bulunamadı",
                    "Bağlı fotoğraf klasörde bulunamadığı için klasör bağı koparıldı."
                );

                return;
            }

            const targetIndex = currentIndex + direction;

            if (targetIndex < 0 || targetIndex >= files.length) {
                return;
            }

            const targetName = files[targetIndex];
            const photo = await this.readPhoto(this.folderPath, targetName);

            if (photo === null) {
                await this.showInfo(
                    "Fotoğraf okunamadı",
                    `"${targetName}" açılamadı.`
                );

                return;
            }

            this.fileName = targetName;
            this.writeStoredLink();
            this.replaceHolder(photo);
            await this.refreshNavState();
            this.selectionTool?.refreshOverlays();
        } finally {
            this.busy = false;
        }

    }

    private addHolder(photo: LinkedPhotoData, selectAfterAdd: boolean): void {

        const height = window.innerHeight / 2;
        const aspect = photo.width > 0 && photo.height > 0
            ? photo.width / photo.height
            : 1;
        const image = new DocumentImage(
            photo.dataUrl,
            HOLDER_MARGIN,
            HOLDER_MARGIN,
            height * aspect,
            height
        );

        // Fotoğraf değişimi geçmişe yazılmaz (karar B).
        this.drawingDocument.getCurrentPage().addImage(image);
        this.holder = image;
        this.documentRenderer.render();

        if (selectAfterAdd && this.selectionTool !== null) {
            this.selectionTool.selectImage(image);
        }

    }

    private replaceHolder(photo: LinkedPhotoData): void {

        const previous = this.holder;

        if (previous === null) {
            this.addHolder(photo, true);

            return;
        }

        const height = previous.getHeight();
        const aspect = photo.width > 0 && photo.height > 0
            ? photo.width / photo.height
            : 1;
        const image = new DocumentImage(
            photo.dataUrl,
            previous.getX(),
            previous.getY(),
            height * aspect,
            height
        );

        const page = this.drawingDocument.getCurrentPage();
        page.removeImage(previous);
        page.addImage(image);
        this.holder = image;
        this.documentRenderer.render();

        if (this.selectionTool !== null) {
            this.selectionTool.selectImage(image);
        }

    }

    private holderOnPage(): boolean {

        if (this.holder === null) {
            return false;
        }

        return this.drawingDocument.getCurrentPage().getImages().includes(this.holder);

    }

    private async refreshNavState(): Promise<void> {

        if (!this.isLinked() || this.folderPath === null || this.fileName === null) {
            this.navState = { prev: false, next: false };

            return;
        }

        const files = await this.listPhotos(this.folderPath);
        const index = files.indexOf(this.fileName);

        if (index === -1) {
            this.navState = { prev: false, next: false };

            return;
        }

        this.navState = { prev: index > 0, next: index < files.length - 1 };

    }

    private async listPhotos(folderPath: string): Promise<string[]> {

        try {
            const files = await window.drAWDesktop?.photoFolder?.listPhotos(folderPath);

            return files ?? [];
        } catch (error) {
            console.error("[PhotoLink] Klasör listelenemedi:", error);

            return [];
        }

    }

    private async readPhoto(folderPath: string, fileName: string): Promise<LinkedPhotoData | null> {

        try {
            const photo = await window.drAWDesktop?.photoFolder?.readPhoto(folderPath, fileName);

            return photo ?? null;
        } catch (error) {
            console.error("[PhotoLink] Fotoğraf okunamadı:", error);

            return null;
        }

    }

    private refreshButton(): void {

        if (this.linkButton === null) {
            return;
        }

        if (!this.isAvailable()) {
            this.linkButton.hidden = true;
            this.linkButton.innerHTML = ICON_LINK;
            this.linkButton.title = "Klasör Bağla";
            this.linkButton.setAttribute("aria-label", "Klasör bağla");

            return;
        }

        this.linkButton.hidden = false;

        if (this.isLinked()) {
            this.linkButton.innerHTML = ICON_UNLINK;
            this.linkButton.title = "Klasör Bağını Kopar";
            this.linkButton.setAttribute("aria-label", "Klasör bağını kopar");
        } else {
            this.linkButton.innerHTML = ICON_LINK;
            this.linkButton.title = "Klasör Bağla";
            this.linkButton.setAttribute("aria-label", "Klasör bağla");
        }

    }

    private readStoredLink(): StoredLink | null {

        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);

            if (raw === null) {
                return null;
            }

            const parsed: unknown = JSON.parse(raw);

            if (typeof parsed !== "object" || parsed === null) {
                return null;
            }

            const record = parsed as Record<string, unknown>;

            if (typeof record.folderPath !== "string" || typeof record.fileName !== "string") {
                return null;
            }

            return { folderPath: record.folderPath, fileName: record.fileName };
        } catch {
            return null;
        }

    }

    private writeStoredLink(): void {

        try {
            if (this.folderPath === null || this.fileName === null) {
                return;
            }

            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
                folderPath: this.folderPath,
                fileName: this.fileName
            }));
        } catch {
            // yok say
        }

    }

    private clearStoredLink(): void {

        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch {
            // yok say
        }

    }

    private async showInfo(title: string, message: string): Promise<void> {

        await confirmDialog({
            title,
            message,
            confirmLabel: "Tamam",
            cancelLabel: "Kapat"
        });

    }

}
