let renameDialogIdCounter = 0;

export function renameDialog(currentName: string): Promise<string | null> {

    return new Promise<string | null>((resolve) => {
        const backdrop = document.createElement("div");
        backdrop.className = "modal-backdrop";

        const titleId = `rename-title-${renameDialogIdCounter++}`;

        const dialog = document.createElement("div");
        dialog.className = "modal";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", titleId);

        const titlebar = document.createElement("div");
        titlebar.className = "modal__titlebar";

        const title = document.createElement("h2");
        title.className = "modal__title";
        title.id = titleId;
        title.textContent = "Yeniden adlandır";

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "modal__close";
        closeButton.setAttribute("aria-label", "Kapat");
        closeButton.textContent = "×";

        titlebar.append(title, closeButton);

        const body = document.createElement("div");
        body.className = "modal__body";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "modal__input";
        input.value = currentName;
        input.maxLength = 120;
        input.setAttribute("aria-label", "Çizim adı");

        body.append(input);

        const actions = document.createElement("div");
        actions.className = "modal__actions";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "modal__button modal__button--cancel";
        cancelButton.textContent = "İptal";

        const saveButton = document.createElement("button");
        saveButton.type = "button";
        saveButton.className = "modal__button modal__button--confirm";
        saveButton.textContent = "Kaydet";

        actions.append(cancelButton, saveButton);
        dialog.append(titlebar, body, actions);
        backdrop.append(dialog);

        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const close = (result: string | null): void => {
            if (backdrop.dataset.closed !== undefined) {
                return;
            }

            backdrop.dataset.closed = "true";
            document.removeEventListener("keydown", onKeyDown);
            backdrop.remove();
            previousFocus?.focus();
            resolve(result);
        };

        const submit = (): void => {
            const value = input.value.trim();

            if (value.length === 0) {
                close(null);

                return;
            }

            close(value);
        };

        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                event.preventDefault();
                close(null);

                return;
            }

            if (event.key === "Enter") {
                event.preventDefault();
                submit();
            }
        };

        cancelButton.addEventListener("click", () => close(null));
        saveButton.addEventListener("click", submit);
        closeButton.addEventListener("click", () => close(null));
        backdrop.addEventListener("click", (event) => {
            if (event.target === backdrop) {
                close(null);
            }
        });

        document.addEventListener("keydown", onKeyDown);
        document.body.appendChild(backdrop);

        input.select();
        input.focus();
    });

}
