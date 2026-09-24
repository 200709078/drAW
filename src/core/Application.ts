import { ManagerContainer } from "./ManagerContainer";
import { ToolbarPanel } from "../ui/ToolbarPanel";
import { ToolbarLeftPanel } from "../ui/ToolbarLeftPanel";
import { TitleBar } from "../ui/TitleBar";
import { ZoomControls } from "../ui/ZoomControls";
import { isSmartBoard } from "../platform/DeviceProfile";

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
        const toolbarPanel = new ToolbarPanel(
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
            this.managers.getPhotoLinkManager()
        );

        new ToolbarLeftPanel(
            this.managers.getToolManager(),
            this.managers.getDocumentRenderer(),
            this.managers.getTextTool(),
            this.managers.getScreenCaptureTool(),
            this.managers.getDesktopAvailable(),
            this.managers.getCanvasManager().getCanvas(),
            toolbarPanel.getNewDrawButton(),
            toolbarPanel.getDrawingsPanel().getPrevButton(),
            toolbarPanel.getDrawingsPanel().getNextButton(),
            this.managers.getPhotoLinkManager()
        );

        void this.managers.getPhotoLinkManager().restore();

        new ZoomControls(this.managers.getDrawingContext().getViewport());

        this.registerShutdownHandlers();

    }

    public getManagers(): ManagerContainer {

        return this.managers;

    }

    private registerShutdownHandlers(): void {

        const autoSaveManager = this.managers.getAutoSaveManager();

        window.addEventListener("pagehide", () => {
            void autoSaveManager.shutdown();
        });

        window.addEventListener("beforeunload", () => {
            void autoSaveManager.shutdown();
        });

        const desktop = window.drAWDesktop;

        if (desktop !== undefined && desktop.onShutdownRequest !== undefined) {
            desktop.onShutdownRequest(() => {
                void autoSaveManager.shutdown().finally(() => {
                    desktop.shutdownComplete();
                });
            });
        }

    }

}
