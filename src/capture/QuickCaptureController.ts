import type { DrawingContext } from "../models/DrawingContext";
import type { Document } from "../document/Document";
import { DocumentImage } from "../document/DocumentImage";
import type { DocumentRenderer } from "../renderers/DocumentRenderer";
import type { HistoryManager } from "../core/HistoryManager";
import type { ToolManager } from "../core/ToolManager";
import type { SelectionTool } from "../tools/SelectionTool";
import { closeTextEditor } from "../ui/TextEditor";
import { confirmDialog } from "../ui/ConfirmDialog";
import type { CaptureMode, QuickCaptureBridge } from "./QuickCaptureBridge";

export class QuickCaptureController {
    private busy = false;
    private revision = 0;
    private readonly context: DrawingContext;
    private readonly document: Document;
    private readonly renderer: DocumentRenderer;
    private readonly history: HistoryManager;
    private readonly tools: ToolManager;
    private readonly selection: SelectionTool;
    private readonly bridge: QuickCaptureBridge | null;

    constructor(
        context: DrawingContext,
        document: Document,
        renderer: DocumentRenderer,
        history: HistoryManager,
        tools: ToolManager,
        selection: SelectionTool,
        bridge: QuickCaptureBridge | null
    ) {
        this.context = context;
        this.document = document;
        this.renderer = renderer;
        this.history = history;
        this.tools = tools;
        this.selection = selection;
        this.bridge = bridge;
        // Yeni çizim, kayıt açma veya undo sırasında geciken sonuç başka çizime eklenmez.
        history.addChangeListener(() => {
            this.revision++;
            if (this.busy) this.bridge?.cancel();
        });
    }

    public isAvailable(): boolean { return this.bridge !== null; }

    public async take(mode: CaptureMode): Promise<void> {
        if (!this.bridge || this.busy) return;
        closeTextEditor();
        this.tools.getActiveTool()?.interruptGesture();
        const revision = this.revision;
        this.busy = true;
        try {
            const reply = await this.bridge.take(mode);
            if (revision !== this.revision || reply.status === "cancelled") return;
            if (reply.status === "error") throw new Error(reply.message);
            const { dataUrl, width, height } = reply.image;
            if (!dataUrl.startsWith("data:image/png;base64,") ||
                !Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
                throw new Error("Alıntı görüntüsü okunamadı. Yeniden deneyin.");
            }
            const viewport = this.context.getViewport();
            // Kaynak pikselleri belge birimlerine birebir aktarılır; ekrana sığdırma uygulanmaz.
            const image = new DocumentImage(dataUrl,
                viewport.screenToWorldX(16), viewport.screenToWorldY(16), width, height);
            this.busy = false;
            this.tools.setTool(this.selection);
            this.history.begin();
            this.document.getCurrentPage().addImage(image);
            this.history.commit();
            this.selection.selectImage(image);
            this.renderer.render();
        } catch (error) {
            if (revision === this.revision) {
                await confirmDialog({
                    title: "Alıntı Alınamadı",
                    message: error instanceof Error ? error.message : "Ekran görüntüsü alınamadı. Yeniden deneyin.",
                    confirmLabel: "Tamam", cancelLabel: "Kapat"
                });
            }
        } finally {
            this.busy = false;
        }
    }
}
