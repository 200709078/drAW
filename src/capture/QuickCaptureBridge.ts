export type CaptureMode = "screen" | "area";

export type CaptureImage = { dataUrl: string; width: number; height: number };
export type CaptureReply =
    | { status: "ok"; image: CaptureImage }
    | { status: "cancelled" }
    | { status: "error"; message: string };

export interface QuickCaptureBridge {
    take(mode: CaptureMode): Promise<CaptureReply>;
    prepare(): void;
    cancel(): void;
}

export function getQuickCaptureBridge(): QuickCaptureBridge | null {
    const desktop = window.drAWDesktop;
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (mobile || !desktop || !["win32", "linux"].includes(desktop.platform ?? "")) return null;
    const bridge = desktop.quickCapture;
    return typeof bridge?.take === "function" && typeof bridge.prepare === "function" &&
        typeof bridge.cancel === "function" ? bridge : null;
}
