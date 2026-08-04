import { Tool } from "../tools/Tool";

export class ToolManager {

    private activeTool: Tool | null = null;
    private readonly changeListeners: Array<() => void> = [];

    constructor() {

    }

    public addChangeListener(listener: () => void): void {

        this.changeListeners.push(listener);

    }

    public setTool(tool: Tool): void {

        if (this.activeTool) {
            this.activeTool.deactivate();
        }

        this.activeTool = tool;

        this.activeTool.activate();

        for (const listener of this.changeListeners) {
            listener();
        }

    }

    public getActiveTool(): Tool | null {

        return this.activeTool;

    }

}
