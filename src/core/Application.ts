import { ManagerContainer } from "./ManagerContainer";
import { ToolbarPanel } from "../ui/ToolbarPanel";
import { TitleBar } from "../ui/TitleBar";
import { ZoomControls } from "../ui/ZoomControls";
import { isSmartBoard } from "../platform/DeviceProfile";
import { registerShutdownHandlers } from "./ShutdownHandlers";
import { closeTextEditor } from "../ui/TextEditor";

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
        new ToolbarPanel(
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
            this.managers.getScreenCaptureTool(),
            this.managers.getDesktopAvailable()
        );

        new ZoomControls(this.managers.getDrawingContext().getViewport());

        registerShutdownHandlers(this.managers.getAutoSaveManager(), closeTextEditor);

    }

    public getManagers(): ManagerContainer {

        return this.managers;

    }

}
