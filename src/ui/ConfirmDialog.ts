export type ConfirmDialogOptions = {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
};

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop";

        const dialog = document.createElement("div");
        dialog.className = "modal";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "modal-title");

        const titlebar = document.createElement("div");
        titlebar.className = "modal__titlebar";

        const title = document.createElement("h2");
        title.className = "modal__title";
        title.id = "modal-title";
        title.textContent = options.title;

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "modal__close";
        closeButton.setAttribute("aria-label", "Kapat");
        closeButton.textContent = "×";

        titlebar.append(title, closeButton);

        const body = document.createElement("div");
        body.className = "modal__body";

        const message = document.createElement("p");
        message.className = "modal__message";
        message.textContent = options.message;

        body.append(message);

        const actions = document.createElement("div");
        actions.className = "modal__actions";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "modal__button modal__button--cancel";
        cancelButton.textContent = options.cancelLabel ?? "İptal";

        const confirmButton = document.createElement("button");
        confirmButton.type = "button";
        confirmButton.className = "modal__button modal__button--confirm";
        confirmButton.textContent = options.confirmLabel ?? "Onayla";

        actions.append(cancelButton, confirmButton);
        dialog.append(titlebar, body, actions);
        backdrop.append(dialog);

        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const close = (result: boolean): void => {
            if (backdrop.dataset.closed !== undefined) {
                return;
            }

            backdrop.dataset.closed = "true";
            document.removeEventListener("keydown", onKeyDown);
            backdrop.remove();
            previousFocus?.focus();
            resolve(result);
        };

        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                event.preventDefault();
                close(false);
            }
        };

        cancelButton.addEventListener("click", () => close(false));
        confirmButton.addEventListener("click", () => close(true));
        closeButton.addEventListener("click", () => close(false));
        backdrop.addEventListener("click", (event) => {
            if (event.target === backdrop) {
                close(false);
            }
        });

        document.addEventListener("keydown", onKeyDown);
        document.body.appendChild(backdrop);
        confirmButton.focus();
    });
}
