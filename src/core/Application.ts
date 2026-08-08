import { ManagerContainer } from "./ManagerContainer";
import { ToolbarPanel } from "../ui/ToolbarPanel";
import { ToolbarLeftPanel } from "../ui/ToolbarLeftPanel";

export class Application {

    private readonly managers: ManagerContainer;

    constructor() {

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
            this.managers.getCanvasManager().getCanvas()
        );

        new ToolbarLeftPanel(
            this.managers.getToolManager(),
            this.managers.getHistoryManager(),
            this.managers.getDocumentRenderer(),
            this.managers.getTextTool(),
            this.managers.getScreenCaptureTool(),
            this.managers.getDesktopAvailable(),
            this.managers.getCanvasManager().getCanvas()
        );

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
