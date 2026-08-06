import { ManagerContainer } from "./ManagerContainer";
import { Sidebar } from "../ui/Sidebar";

export class Application {

    private readonly managers: ManagerContainer;

    constructor() {

        this.managers = new ManagerContainer();
        new Sidebar(
            this.managers.getToolManager(),
            this.managers.getPenTool(),
            this.managers.getEraserTool(),
            this.managers.getHighlighterTool(),
            this.managers.getSelectionTool(),
            this.managers.getPartialEraserTool(),
            this.managers.getDocument(),
            this.managers.getDocumentRenderer(),
            this.managers.getHistoryManager(),
            this.managers.getScreenCaptureTool(),
            this.managers.getTextTool()
        );

    }

    public getManagers(): ManagerContainer {

        return this.managers;

    }

}
