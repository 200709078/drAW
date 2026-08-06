import { TextObject, TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT } from "../document/TextObject";

let activeTextEditor: TextEditor | null = null;

export function openTextEditor(
    textObject: TextObject,
    onFinish?: (value: string) => void
): void {

    closeTextEditor();

    const editor = new TextEditor(textObject, onFinish);

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
    private readonly onFinish: ((value: string) => void) | undefined;
    private readonly anchorY: number;
    private finished: boolean;

    constructor(
        textObject: TextObject,
        onFinish?: (value: string) => void
    ) {

        this.onFinish = onFinish;
        this.finished = false;
        this.anchorY = textObject.getY();

        this.textarea = document.createElement("textarea");
        this.textarea.className = "text-editor";
        this.textarea.value = textObject.getText();
        this.textarea.spellcheck = false;

        const fontSize = textObject.getFontSize() * textObject.getScale();

        this.textarea.style.left = `${textObject.getX()}px`;
        this.textarea.style.fontFamily = TEXT_FONT_FAMILY;
        this.textarea.style.fontSize = `${fontSize}px`;
        this.textarea.style.lineHeight = `${TEXT_LINE_HEIGHT}`;
        this.textarea.style.color = textObject.getColor();

    }

    public open(): void {

        document.body.appendChild(this.textarea);
        this.textarea.addEventListener("keydown", this.handleKeyDown);
        this.textarea.addEventListener("blur", this.finish);
        this.textarea.addEventListener("input", this.handleInput);
        this.handleInput();

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

        this.textarea.style.top = `${this.anchorY - this.textarea.offsetHeight / 2}px`;

    };

    private finish = (): void => {

        if (this.finished) {
            return;
        }

        this.finished = true;
        this.textarea.removeEventListener("keydown", this.handleKeyDown);
        this.textarea.removeEventListener("blur", this.finish);
        this.textarea.removeEventListener("input", this.handleInput);
        this.textarea.remove();
        this.onFinish?.(this.textarea.value);

    };

}
