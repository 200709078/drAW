import type { Storage } from "./Storage";
import { WebStorageProvider } from "./providers/WebStorageProvider";
import { ElectronStorageProvider } from "./providers/ElectronStorageProvider";
import { isDesktopAvailable } from "../platform/ScreenCaptureGateway";

export function createStorageProvider(): Storage {

    if (isDesktopAvailable()) {
        return new ElectronStorageProvider();
    }

    return new WebStorageProvider();

}
