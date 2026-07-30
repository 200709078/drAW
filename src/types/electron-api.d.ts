export type ScreenCaptureResult = {
    dataUrl: string;
    width: number;
    height: number;
};

declare global {
    interface Window {
        drAWDesktop?: {
            requestScreenCapture: () => Promise<ScreenCaptureResult | null>;
            cancelScreenCapture: () => void;
        };
    }
}

export {};
