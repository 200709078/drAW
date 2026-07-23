import { Page } from "./Page";

export class Document {

    private readonly pages: Page[];
    private currentPageIndex: number;

    constructor() {

        this.pages = [];
        this.pages.push(new Page());

        this.currentPageIndex = 0;

    }

    public getCurrentPage(): Page {

        return this.pages[this.currentPageIndex];

    }

    public clearCurrentPage(): void {

        this.getCurrentPage().clearStrokes();

    }

}
