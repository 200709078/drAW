import { confirmDialog } from "./ConfirmDialog";

let activeDialog: Promise<void> | null = null;

export function showStorageError(error: unknown): Promise<void> {

    console.error("[Storage] İşlem tamamlanamadı:", error);

    if (activeDialog === null) {
        activeDialog = confirmDialog({
            title: "Kayıt İşlemi Tamamlanamadı",
            message: "Depolama alanını ve erişim izinlerini kontrol edip işlemi yeniden deneyin. Kaydedilmemiş çalışmanız varsa bu pencereyi açık tutun.",
            confirmLabel: "Tamam",
            cancelLabel: "Kapat"
        }).then(() => undefined).finally(() => {
            activeDialog = null;
        });
    }

    return activeDialog;

}
