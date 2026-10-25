import { ManagerContainer } from "./ManagerContainer";
import { ToolbarPanel } from "../ui/ToolbarPanel";
import { TitleBar } from "../ui/TitleBar";
import { ZoomControls } from "../ui/ZoomControls";
import { isSmartBoard } from "../platform/DeviceProfile";
import { registerShutdownHandlers } from "./ShutdownHandlers";
import { closeTextEditor } from "../ui/TextEditor";
import { bindAndroid } from "../platform/AndroidApp";

export class Application {

    private readonly managers: ManagerContainer;

    constructor() {

        document.body.classList.toggle("board-mode", isSmartBoard());

        // Trackpad pinch'i sayfa zoom'una dönüşmesin (gerçek yakınlaştırma
        // aracı gelene kadar düzeni koru).
        window.addEventListener("wheel", (event) => {
            if (event.ctrlKey) {
                event.preventDefault();
            }
        }, { passive: false });

        new TitleBar();
        this.managers = new ManagerContainer();
        // Toolbar yerleşimi yakınlaştırma düğmeleriyle çakışmayı ölçer; önce onlar oluşur.
        new ZoomControls(this.managers.getDrawingContext().getViewport());
        const toolbar = new ToolbarPanel(
            this.managers.getToolManager(),
            this.managers.getPenTool(),
            this.managers.getEraserTool(),
            this.managers.getHighlighterTool(),
            this.managers.getSelectionTool(),
            this.managers.getPartialEraserTool(),
            this.managers.getDocument(),
            this.managers.getDocumentRenderer(),
            this.managers.getHistoryManager(),
            this.managers.getShapesTool(),
            this.managers.getAutoSaveManager(),
            this.managers.getDrawingRepository(),
            this.managers.getCanvasManager().getCanvas(),
            this.managers.getPhotoLinkManager(),
            this.managers.getTextTool(),
            this.managers.getQuickCapture()
        );

        registerShutdownHandlers(this.managers.getAutoSaveManager(), closeTextEditor);

        const autoSave = this.managers.getAutoSaveManager();
        bindAndroid({
            // Sıra: üstteki pencere (Kapat düğmesi), metin düzenleyici, palet, çizimler paneli, seçim.
            back: () => {
                const dialogs = document.querySelectorAll<HTMLButtonElement>(".modal-backdrop .modal__close");
                const dialog = dialogs[dialogs.length - 1];
                if (dialog !== undefined) {
                    dialog.click();
                    return true;
                }
                return closeTextEditor() || toolbar.closeOpenPanel() || this.managers.getSelectionTool().dropSelection();
            },
            pause: () => {
                closeTextEditor();
                void autoSave.saveIfNeeded().catch(() => undefined);
            }
        });

    }

    public getManagers(): ManagerContainer {

        return this.managers;

    }

}
