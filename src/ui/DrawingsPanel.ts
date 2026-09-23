import type { DrawingRepository } from "../storage/DrawingRepository";
import type { DrawingDocument } from "../storage/DrawingDocument";
import type { AutoSaveManager } from "../autosave/AutoSaveManager";
import type { ToolManager } from "../core/ToolManager";
import type { SelectionTool } from "../tools/SelectionTool";
import type { Document } from "../document/Document";
import type { DocumentRenderer } from "../renderers/DocumentRenderer";
import type { HistoryManager } from "../core/HistoryManager";
import { ThumbnailGenerator } from "../autosave/ThumbnailGenerator";
import { DocumentStateSerializer } from "../autosave/DocumentStateSerializer";
import { renameDialog } from "./RenameDialog";

export type DrawingsPanelOptions = {
    repository: DrawingRepository;
    autoSaveManager: AutoSaveManager;
    toolManager: ToolManager;
    selectionTool: SelectionTool;
    drawingDocument: Document;
    documentRenderer: DocumentRenderer;
    historyManager: HistoryManager;
    canvas: HTMLCanvasElement;
};

export class DrawingsPanel {

    private static readonly ICON_RENAME = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"`,
        ` stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
        `<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>`,
        `<path d="m15 5 4 4"/>`,
        `</svg>`
    ].join("");

    private static readonly ICON_DELETE = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"`,
        ` stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
        `<path d="M18 6 6 18"/>`,
        `<path d="m6 6 12 12"/>`,
        `</svg>`
    ].join("");

    private static readonly ICON_CHEVRON = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"`,
        ` stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
        `<path d="m9 18 6-6-6-6"/>`,
        `</svg>`
    ].join("");

    private static readonly ICON_PREV = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"`,
        ` stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
        `<path d="m15 18-6-6 6-6"/>`,
        `</svg>`
    ].join("");

    private static readonly ICON_NEXT = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"`,
        ` stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`,
        `<path d="m9 18 6-6-6-6"/>`,
        `</svg>`
    ].join("");

    private readonly repository: DrawingRepository;
    private readonly autoSaveManager: AutoSaveManager;
    private readonly toolManager: ToolManager;
    private readonly selectionTool: SelectionTool;
    private readonly drawingDocument: Document;
    private readonly documentRenderer: DocumentRenderer;
    private readonly historyManager: HistoryManager;
    private readonly thumbnailGenerator: ThumbnailGenerator;
    private readonly stateSerializer: DocumentStateSerializer;

    private readonly listElement: HTMLElement;
    private readonly toggleElement: HTMLButtonElement;
    private readonly prevButton: HTMLButtonElement;
    private readonly nextButton: HTMLButtonElement;

    private readonly cards: Map<string, HTMLElement>;
    private readonly recordsById: Map<string, DrawingDocument>;
    // Yeniden eskiye sıralı kayıt id listesi (refresh ile güncellenir).
    private orderedIds: string[];
    private navigating: boolean;
    // Kaydedilmemiş ama üretilmiş canlı önizleme (yalnızca aktif kart).
    private liveThumbnail: { id: string; dataUrl: string } | null;
    private livePreviewTimer: ReturnType<typeof setTimeout> | null;
    private livePreviewRequest: number;
    private openState: boolean;
    private refreshScheduled: boolean;

    private static readonly LIVE_PREVIEW_DEBOUNCE_MS = 800;

    constructor(options: DrawingsPanelOptions) {

        this.repository = options.repository;
        this.autoSaveManager = options.autoSaveManager;
        this.toolManager = options.toolManager;
        this.selectionTool = options.selectionTool;
        this.drawingDocument = options.drawingDocument;
        this.documentRenderer = options.documentRenderer;
        this.historyManager = options.historyManager;
        this.thumbnailGenerator = new ThumbnailGenerator();
        this.stateSerializer = new DocumentStateSerializer();

        this.cards = new Map();
        this.recordsById = new Map();
        this.orderedIds = [];
        this.navigating = false;
        this.liveThumbnail = null;
        this.livePreviewTimer = null;
        this.livePreviewRequest = 0;
        this.openState = true;
        this.refreshScheduled = false;

        const built = this.buildDom(options.canvas);

        this.listElement = built.list;
        this.toggleElement = built.toggle;
        this.prevButton = built.prev;
        this.nextButton = built.next;

        this.historyManager.addChangeListener(() => {
            this.scheduleRefresh();
            this.scheduleLivePreview();
        });
        this.autoSaveManager.addSaveListener(() => this.scheduleRefresh());
        // Açılışta açık gelsin; sadece toggle butonu kapatıp açabilsin.
        this.open();
        void this.refresh();

    }

    public isOpen(): boolean {

        return this.openState;

    }

    public getPrevButton(): HTMLButtonElement {

        return this.prevButton;

    }

    public getNextButton(): HTMLButtonElement {

        return this.nextButton;

    }

    public open(): void {

        this.openState = true;
        document.body.classList.remove("drawings-closed");
        this.toggleElement.setAttribute("aria-label", "Kapat");

    }

    public close(): void {

        this.openState = false;
        document.body.classList.add("drawings-closed");
        this.toggleElement.setAttribute("aria-label", "Aç");

    }

    public toggle(): void {

        if (this.isOpen()) {
            this.close();

            return;
        }

        this.open();

    }

    public async refresh(): Promise<void> {

        let documents: DrawingDocument[];

        try {
            documents = await this.repository.listDocuments();
        } catch (error) {
            console.error("[Drawings] Kayıtlar listelenemedi:", error);

            return;
        }

        // Sabit sıralama: yeniden eskiye createdAt'e göre.
        // updatedAt her kaydetmede değiştiği için gezinme sırasında
        // listenin yer değiştirmesine yol açıyordu.
        documents.sort((first, second) => {
            return second.getCreatedAt().localeCompare(first.getCreatedAt());
        });

        const activeId = this.autoSaveManager.getActiveDocument()?.getId() ?? null;

        this.recordsById.clear();
        this.orderedIds = documents.map((document) => document.getId());

        const presentIds = new Set<string>();

        for (const document of documents) {
            presentIds.add(document.getId());
            this.recordsById.set(document.getId(), document);
        }

        for (const [id, card] of this.cards) {
            if (!presentIds.has(id)) {
                card.remove();
                this.cards.delete(id);
            }
        }

        for (const document of documents) {
            const id = document.getId();
            let card = this.cards.get(id);

            if (card === undefined) {
                card = this.createCard();
                this.cards.set(id, card);
            }

            this.updateCard(card, document, activeId);
            this.listElement.appendChild(card);
        }

        this.listElement.hidden = documents.length === 0;
        this.refreshNavButtons();

    }

    // direction: +1 eski kayıt (Önceki), -1 yeni kayıt (Sonraki).
    // Liste yeniden eskiye sıralı.
    private targetId(direction: 1 | -1): string | null {

        if (this.orderedIds.length === 0) {
            return null;
        }

        const activeId = this.autoSaveManager.getActiveDocument()?.getId() ?? null;
        const activeIndex = activeId === null
            ? -1
            : this.orderedIds.indexOf(activeId);

        // Aktif çizim listede yoksa (kaydedilmemiş yeni çizim) en yeninin
        // öncesinde sayılır: Önceki en yeni kayıtlı çizime gider.
        const baseIndex = activeIndex === -1 ? -1 : activeIndex;
        const targetIndex = baseIndex + direction;

        if (targetIndex < 0 || targetIndex >= this.orderedIds.length) {
            return null;
        }

        return this.orderedIds[targetIndex];

    }

    private refreshNavButtons(): void {

        this.prevButton.disabled = this.navigating || this.targetId(1) === null;
        this.nextButton.disabled = this.navigating || this.targetId(-1) === null;

    }

    private async stepDrawing(direction: 1 | -1): Promise<void> {

        if (this.navigating) {
            return;
        }

        const id = this.targetId(direction);

        if (id === null) {
            return;
        }

        const stored = this.recordsById.get(id) ?? null;

        if (stored === null) {
            return;
        }

        this.navigating = true;
        this.refreshNavButtons();

        try {
            await this.openDrawing(stored);
        } finally {
            this.navigating = false;
            this.refreshNavButtons();
        }

    }

    private buildDom(
        canvas: HTMLCanvasElement
    ): { panel: HTMLElement; list: HTMLElement; toggle: HTMLButtonElement; prev: HTMLButtonElement; next: HTMLButtonElement } {

        const panel = document.createElement("aside");
        panel.className = "drawings-panel";
        panel.setAttribute("aria-label", "Drawings");

        const header = document.createElement("header");
        header.className = "drawings-panel__header";

        const title = document.createElement("h2");
        title.className = "drawings-panel__title";
        title.textContent = "ÇİZİMLER";

        const createNavButton = (
            label: string,
            icon: string
        ): HTMLButtonElement => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "sidebar__history";
            button.title = label;
            button.setAttribute("aria-label", label);
            button.innerHTML = icon;
            button.disabled = true;

            return button;
        };

        const prev = createNavButton("Önceki Çizim", DrawingsPanel.ICON_PREV);
        const next = createNavButton("Sonraki Çizim", DrawingsPanel.ICON_NEXT);
        prev.addEventListener("click", () => {
            void this.stepDrawing(1);
        });
        next.addEventListener("click", () => {
            void this.stepDrawing(-1);
        });

        header.append(title);
        panel.appendChild(header);

        const list = document.createElement("div");
        list.className = "drawings-panel__list";
        list.setAttribute("role", "list");
        panel.appendChild(list);

        document.body.appendChild(panel);

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "drawings-panel__toggle";
        toggle.setAttribute("aria-label", "Drawings panelini kapat");
        toggle.innerHTML = DrawingsPanel.ICON_CHEVRON;
        toggle.addEventListener("click", () => this.toggle());
        document.body.appendChild(toggle);

        // Tuvale tıklayınca çizimler paneli otomatik kapanır.
        canvas.addEventListener("pointerdown", () => {
            if (this.isOpen()) {
                this.close();
            }
        });

        return { panel, list, toggle, prev, next };

    }

    private createCard(): HTMLElement {

        const card = document.createElement("div");
        card.className = "drawings-card";
        card.setAttribute("role", "listitem");
        card.setAttribute("aria-current", "false");

        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "drawings-card__open";

        const thumbnail = document.createElement("div");
        thumbnail.className = "drawings-card__thumbnail";

        const image = document.createElement("img");
        image.alt = "";
        image.draggable = false;
        thumbnail.appendChild(image);

        const name = document.createElement("span");
        name.className = "drawings-card__name";

        openButton.append(thumbnail, name);

        const actions = document.createElement("div");
        actions.className = "drawings-card__actions";

        const renameButton = document.createElement("button");
        renameButton.type = "button";
        renameButton.className = "drawings-card__action";
        renameButton.title = "Yeniden Adlandır";
        renameButton.setAttribute("aria-label", "Yeniden adlandır");
        renameButton.innerHTML = DrawingsPanel.ICON_RENAME;

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "drawings-card__action drawings-card__action--danger";
        deleteButton.title = "Sil";
        deleteButton.setAttribute("aria-label", "Sil");
        deleteButton.innerHTML = DrawingsPanel.ICON_DELETE;

        actions.append(deleteButton, renameButton);

        card.append(openButton, actions);

        openButton.addEventListener("click", () => {
            const documentData = this.documentFor(card);

            if (documentData !== null) {
                void this.openDrawing(documentData);
            }
        });

        renameButton.addEventListener("click", (event) => {
            event.stopPropagation();
            const documentData = this.documentFor(card);

            if (documentData !== null) {
                void this.renameDrawing(documentData);
            }
        });

        deleteButton.addEventListener("click", (event) => {
            event.stopPropagation();
            const documentData = this.documentFor(card);

            if (documentData !== null) {
                void this.deleteDrawing(documentData);
            }
        });

        return card;

    }

    private updateCard(
        card: HTMLElement,
        documentData: DrawingDocument,
        activeId: string | null
    ): void {

        const id = documentData.getId();
        card.dataset.id = id;

        const nameElement = card.querySelector<HTMLSpanElement>(".drawings-card__name");

        if (nameElement !== null && nameElement.textContent !== documentData.getDisplayName()) {
            nameElement.textContent = documentData.getDisplayName();
        }

        const image = card.querySelector<HTMLImageElement>(".drawings-card__thumbnail img");
        const thumbnail = documentData.getThumbnail();
        const storedUrl = thumbnail !== null ? thumbnail.dataUrl : "";
        // Aktif kartta depodaki resimden daha taze canlı önizleme varsa onu göster.
        const liveUrl = this.liveThumbnail !== null && this.liveThumbnail.id === id
            ? this.liveThumbnail.dataUrl
            : null;
        const dataUrl = liveUrl ?? storedUrl;

        if (image !== null && image.getAttribute("src") !== dataUrl) {
            image.setAttribute("src", dataUrl);
            image.hidden = dataUrl === "";
        }

        const isActive = id === activeId;
        const wasActive = card.classList.contains("drawings-card--active");

        if (isActive !== wasActive) {
            card.classList.toggle("drawings-card--active", isActive);
            card.setAttribute("aria-current", isActive ? "true" : "false");
        }

    }

    private documentFor(card: HTMLElement): DrawingDocument | null {

        const id = card.dataset.id;

        if (id === undefined) {
            return null;
        }

        return this.recordsById.get(id) ?? null;

    }

    private async openDrawing(stored: DrawingDocument): Promise<void> {

        const active = this.autoSaveManager.getActiveDocument();
        const alreadyOpen = active !== null && active.getId() === stored.getId();

        if (!alreadyOpen) {
            this.toolManager.getActiveTool()?.cancel();
            this.documentRenderer.clearSelection();
            this.historyManager.reset();
            await this.autoSaveManager.openDrawing(stored);
            this.documentRenderer.render();
        }

        this.scheduleRefresh();
        window.dispatchEvent(new CustomEvent("drawing:opened"));

    }

    private async renameDrawing(stored: DrawingDocument): Promise<void> {

        const newName = await renameDialog(stored.getDisplayName());

        if (newName === null || newName === stored.getDisplayName()) {
            return;
        }

        const active = this.autoSaveManager.getActiveDocument();
        const isActive = active !== null && active.getId() === stored.getId();

        if (isActive) {
            await this.autoSaveManager.saveIfNeeded();
        }

        await this.repository.renameDocument(stored.getId(), newName);

        if (isActive) {
            const renamed = await this.repository.loadDocument(stored.getId());

            if (renamed !== null) {
                this.toolManager.getActiveTool()?.cancel();
                this.documentRenderer.clearSelection();
                this.historyManager.reset();
                this.autoSaveManager.resetActiveDocument();
                await this.autoSaveManager.openDrawing(renamed);
                this.documentRenderer.render();
            }
        }

        this.scheduleRefresh();

    }

    private async deleteDrawing(stored: DrawingDocument): Promise<void> {

        const active = this.autoSaveManager.getActiveDocument();
        const isActive = active !== null && active.getId() === stored.getId();

        if (!isActive) {
            await this.autoSaveManager.saveIfNeeded();
        }

        await this.repository.deleteDocument(stored.getId());

        if (isActive) {
            this.toolManager.getActiveTool()?.cancel();
            this.documentRenderer.clearSelection();
            this.drawingDocument.clearCurrentPage();
            this.historyManager.reset();
            this.autoSaveManager.resetActiveDocument();
            this.toolManager.setTool(this.selectionTool);
            this.documentRenderer.render();
        }

        this.scheduleRefresh();

    }

    private scheduleRefresh(): void {

        if (this.refreshScheduled) {
            return;
        }

        this.refreshScheduled = true;

        setTimeout(() => {
            this.refreshScheduled = false;
            void this.refresh();
        }, 0);

    }

    private scheduleLivePreview(): void {

        if (this.livePreviewTimer !== null) {
            clearTimeout(this.livePreviewTimer);
        }

        this.livePreviewTimer = setTimeout(() => {
            this.livePreviewTimer = null;
            void this.updateLivePreview();
        }, DrawingsPanel.LIVE_PREVIEW_DEBOUNCE_MS);

    }

    private async updateLivePreview(): Promise<void> {

        const active = this.autoSaveManager.getActiveDocument();

        if (active === null) {
            return;
        }

        const request = this.livePreviewRequest + 1;
        this.livePreviewRequest = request;
        const id = active.getId();

        let dataUrl: string;

        try {
            const data = this.stateSerializer.serialize(
                this.drawingDocument.createSnapshot()
            );
            const thumbnail = await this.thumbnailGenerator.generate(data);
            dataUrl = thumbnail.dataUrl;
        } catch (error) {
            console.error("[Drawings] Canlı önizleme üretilemedi:", error);

            return;
        }

        if (request !== this.livePreviewRequest) {
            return;
        }

        this.liveThumbnail = { id, dataUrl };

        const card = this.cards.get(id);
        const image = card?.querySelector<HTMLImageElement>(
            ".drawings-card__thumbnail img"
        ) ?? null;

        if (image !== null) {
            image.setAttribute("src", dataUrl);
            image.hidden = false;
        }

    }

}
