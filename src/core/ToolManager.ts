import { Tool } from "../tools/Tool";

export class ToolManager {

    private activeTool: Tool | null = null;

    constructor() {

    }

    public setTool(tool: Tool): void {

        if (this.activeTool) {
            this.activeTool.deactivate();
        }

        this.activeTool = tool;

        this.activeTool.activate();

    }

    public getActiveTool(): Tool | null {

        return this.activeTool;

    }

}
