import { TextObject, TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT } from "../document/TextObject";
import type { ViewportManager } from "../core/ViewportManager";
import { getTitlebarOffset } from "./TitleBar";

let activeTextEditor: TextEditor | null = null;

export function openTextEditor(
    textObject: TextObject,
    onFinish?: (value: string) => void,
    viewport?: ViewportManager
): void {

    closeTextEditor();

    const editor = new TextEditor(textObject, onFinish, viewport);

    activeTextEditor = editor;
    editor.open();

}

export function closeTextEditor(): void {

    if (activeTextEditor !== null) {
        activeTextEditor.close();
        activeTextEditor = null;
    }

}

class TextEditor {

    private readonly textarea: HTMLTextAreaElement;
    private readonly textObject: TextObject;
    private readonly onFinish: ((value: string) => void) | undefined;
    private readonly viewport: ViewportManager | undefined;
    private readonly anchorY: number;
    private finished: boolean;

    constructor(
        textObject: TextObject,
        onFinish?: (value: string) => void,
        viewport?: ViewportManager
    ) {

        this.textObject = textObject;
        this.onFinish = onFinish;
        this.viewport = viewport;
        this.finished = false;
        this.anchorY = textObject.getY();

        this.textarea = document.createElement("textarea");
        this.textarea.className = "text-editor";
        this.textarea.value = textObject.getText();
        this.textarea.spellcheck = false;

        this.reposition();

    }

    public open(): void {

        document.body.appendChild(this.textarea);
        this.textarea.addEventListener("keydown", this.handleKeyDown);
        this.textarea.addEventListener("blur", this.finish);
        this.textarea.addEventListener("input", this.handleInput);
        this.handleInput();

        if (this.viewport !== undefined) {
            this.viewport.addChangeListener(this.reposition);
        }

        requestAnimationFrame(() => {
            if (!this.finished) {
                this.textarea.focus();
                this.textarea.select();
            }
        });

    }

    public close(): void {

        this.finish();

    }

    private handleKeyDown = (event: KeyboardEvent): void => {

        if (event.key === "Escape") {
            event.preventDefault();
            this.finish();
        }

    };

    private handleInput = (): void => {

        this.textarea.style.height = "auto";
        this.textarea.style.height = `${this.textarea.scrollHeight}px`;
        this.centerVertically();

    };

    private centerVertically = (): void => {

        const anchorScreenY = this.viewport !== undefined
            ? this.viewport.worldToScreenY(this.anchorY)
            : this.anchorY;

        this.textarea.style.top = `${anchorScreenY + getTitlebarOffset() - this.textarea.offsetHeight / 2}px`;

    };

    private reposition = (): void => {

        const scale = this.viewport?.getScale() ?? 1;
        const x = this.viewport !== undefined
            ? this.viewport.worldToScreenX(this.textObject.getX())
            : this.textObject.getX();
        const fontSize = this.textObject.getFontSize() * this.textObject.getScale() * scale;

        this.textarea.style.left = `${x}px`;
        this.textarea.style.fontFamily = TEXT_FONT_FAMILY;
        this.textarea.style.fontSize = `${fontSize}px`;
        this.textarea.style.lineHeight = `${TEXT_LINE_HEIGHT}`;
        this.textarea.style.color = this.textObject.getColor();
        this.centerVertically();

    };

    private finish = (): void => {

        if (this.finished) {
            return;
        }

        this.finished = true;
        this.textarea.removeEventListener("keydown", this.handleKeyDown);
        this.textarea.removeEventListener("blur", this.finish);
        this.textarea.removeEventListener("input", this.handleInput);

        if (this.viewport !== undefined) {
            this.viewport.removeChangeListener(this.reposition);
        }

        this.textarea.remove();
        this.onFinish?.(this.textarea.value);

    };

}
