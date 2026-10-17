import { isSmartBoard } from "./DeviceProfile.ts";

export type ScreenKeyboardResult = "shown" | "unavailable" | "cancelled";

export interface ScreenKeyboardBridge {
    show(requestId: string): Promise<ScreenKeyboardResult>;
    hide(requestId: string): void;
}

export function getScreenKeyboardBridge(): ScreenKeyboardBridge | null {
    const desktop = window.drAWDesktop;
    if (!isSmartBoard() || desktop?.platform !== "linux" ||
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return null;
    const bridge = desktop.screenKeyboard;
    return typeof bridge?.show === "function" && typeof bridge.hide === "function" ? bridge : null;
}
