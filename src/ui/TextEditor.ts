import { TextObject, TEXT_FONT_FAMILY, TEXT_LINE_HEIGHT } from "../document/TextObject";
import type { ViewportManager } from "../core/ViewportManager";
import { getTitlebarOffset } from "./TitleBar";
import { getScreenKeyboardBridge } from "../platform/ScreenKeyboardBridge";

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

    const editor = activeTextEditor;
    activeTextEditor = null;
    editor?.close();

}

class TextEditor {

    private readonly textarea: HTMLTextAreaElement;
    private readonly textObject: TextObject;
    private readonly onFinish: ((value: string) => void) | undefined;
    private readonly viewport: ViewportManager | undefined;
    private readonly anchorY: number;
    private finished: boolean;
    private readonly keyboard = getScreenKeyboardBridge();
    private keyboardRequestId: string | null = null;
    private keyboardPending = false;
    private keyboardStatus: HTMLDivElement | null = null;

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
        this.textarea.inputMode = "text";
        this.textarea.setAttribute("aria-label", "Metin düzenle");

        this.reposition();

    }

    public open(): void {

        document.body.appendChild(this.textarea);
        this.textarea.addEventListener("keydown", this.handleKeyDown);
        this.textarea.addEventListener("blur", this.handleBlur);
        this.textarea.addEventListener("input", this.handleInput);
        this.textarea.addEventListener("pointerup", this.requestKeyboard);
        this.handleInput();

        if (this.viewport !== undefined) {
            this.viewport.addChangeListener(this.reposition);
        }

        requestAnimationFrame(() => {
            if (!this.finished) {
                this.textarea.focus();
                this.textarea.select();
                this.requestKeyboard();
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

    private handleBlur = (): void => {
        // A native keyboard/settings window can briefly take application focus.
        // Keep the editor alive; an actual focus change inside drAW still finishes it.
        if (this.keyboard && !document.hasFocus()) return;
        this.finish();
    };

    private requestKeyboard = (): void => {
        if (!this.keyboard || this.finished || this.keyboardPending) return;
        this.keyboardRequestId ??= crypto.randomUUID();
        this.keyboardPending = true;
        void this.keyboard.show(this.keyboardRequestId).catch(() => "unavailable" as const).then((result) => {
            this.keyboardPending = false;
            if (this.finished) return;
            this.keyboardStatus?.remove();
            this.keyboardStatus = null;
            if (result === "unavailable") {
                this.keyboardStatus = document.createElement("div");
                this.keyboardStatus.className = "text-editor-status";
                this.keyboardStatus.setAttribute("role", "status");
                this.keyboardStatus.textContent = "Ekran klavyesi açılamadı. ETA Klavye veya Onboard kurulumunu kontrol edin. Yeniden denemek için metne dokunun.";
                document.body.appendChild(this.keyboardStatus);
                this.positionKeyboardStatus();
            }
        });
    };

    private positionKeyboardStatus(): void {
        if (!this.keyboardStatus) return;
        const rect = this.textarea.getBoundingClientRect();
        this.keyboardStatus.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 368))}px`;
        this.keyboardStatus.style.top = `${Math.max(8, Math.min(rect.bottom + 8,
            window.innerHeight - this.keyboardStatus.offsetHeight - 8))}px`;
    }

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
        this.positionKeyboardStatus();

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
        // Bitirme geri çağrısı yeni bir editör açabilir veya aracı değiştirebilir.
        if (activeTextEditor === this) {
            activeTextEditor = null;
        }

        this.textarea.removeEventListener("keydown", this.handleKeyDown);
        this.textarea.removeEventListener("blur", this.handleBlur);
        this.textarea.removeEventListener("input", this.handleInput);
        this.textarea.removeEventListener("pointerup", this.requestKeyboard);
        if (this.keyboardRequestId) this.keyboard?.hide(this.keyboardRequestId);
        this.keyboardStatus?.remove();

        if (this.viewport !== undefined) {
            this.viewport.removeChangeListener(this.reposition);
        }

        this.textarea.remove();
        this.onFinish?.(this.textarea.value);

    };

}
