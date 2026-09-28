import type { AutoSaveManager } from "../autosave/AutoSaveManager";
import { showStorageError } from "../ui/StorageErrorDialog";

export function registerShutdownHandlers(autoSaveManager: AutoSaveManager): void {

    const desktop = window.drAWDesktop;

    if (desktop !== undefined) {
        desktop.onShutdownRequest(() => {
            void autoSaveManager.shutdown().then(() => {
                desktop.shutdownComplete();
            }).catch((error: unknown) => {
                desktop.shutdownCancelled();
                void showStorageError(error);
            });
        });

    }

    // Tarayıcı kapanışta asenkron kaydı beklemez; kaydedilmemiş çizimde kullanıcıyı uyar.
    window.addEventListener("beforeunload", (event) => {
        if (autoSaveManager.isDirty()) {
            if (desktop === undefined) {
                event.preventDefault();
                event.returnValue = "";
            }
            void autoSaveManager.saveIfNeeded().catch(() => undefined);
        }
    });

    window.addEventListener("pagehide", () => {
        void autoSaveManager.saveIfNeeded().catch(() => undefined);
    });

}
