import type { ScreenCaptureResult } from "../types/electron-api";

export interface ScreenCaptureGateway {

    requestScreenCapture(): Promise<ScreenCaptureResult | null>;
    cancelScreenCapture(): void;

}

export function getScreenCaptureGateway(): ScreenCaptureGateway | null {

    return window.drAWDesktop ?? null;

}
