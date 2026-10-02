export type LineProfile = "standard" | "smartboard";

export const STANDARD_LINE_WIDTHS = [1, 2, 4, 6, 10, 16, 24, 32];
export const SMARTBOARD_LINE_WIDTHS = [24, 30, 36, 42, 50, 56, 70, 90];
export const STANDARD_DEFAULT_LINE_WIDTH = 6;
export const SMARTBOARD_DEFAULT_LINE_WIDTH = 42;

// Tahtada metin boyu kalem genişliğine eşitlenir, bu aralıkta tutulur.
export const BOARD_MIN_TEXT_FONT_SIZE = 32;
export const BOARD_MAX_TEXT_FONT_SIZE = 64;

let cachedProfile: LineProfile | null = null;

export function detectSmartBoard(): boolean {

    try {
        const params = new URLSearchParams(window.location.search);

        if (params.get("tahta") === "1" || params.get("board") === "smart") {
            return true;
        }
    } catch {
        // yok say
    }

    const touchPoints = navigator.maxTouchPoints ?? 0;
    const screenWidth = window.screen?.width ?? window.innerWidth;
    const screenHeight = window.screen?.height ?? window.innerHeight;
    const minSide = Math.min(screenWidth, screenHeight);
    const maxSide = Math.max(screenWidth, screenHeight);

    // Akıllı tahtalar genelde 20+ dokunmatik nokta bildirir.
    if (touchPoints >= 20) {
        return true;
    }

    if (touchPoints >= 10 && minSide >= 900 && maxSide >= 1800) {
        return true;
    }

    return false;

}

export function getLineProfile(): LineProfile {

    if (cachedProfile === null) {
        cachedProfile = detectSmartBoard() ? "smartboard" : "standard";
    }

    return cachedProfile;

}

export function isSmartBoard(): boolean {

    return getLineProfile() === "smartboard";

}

export function widthsForDeviceProfile(profile: LineProfile): number[] {

    return profile === "smartboard" ? SMARTBOARD_LINE_WIDTHS : STANDARD_LINE_WIDTHS;

}

export function defaultWidthForDeviceProfile(profile: LineProfile): number {

    return profile === "smartboard"
        ? SMARTBOARD_DEFAULT_LINE_WIDTH
        : STANDARD_DEFAULT_LINE_WIDTH;

}

export function shapeLineWidthForProfile(lineWidth: number, profile: LineProfile): number {

    // Tahtada basınç bildirmeyen dokunma genellikle 0.5 basınçla çizilir.
    // Sabit kalınlıklı şekilleri bu kalem görünümüne yaklaştır.
    return profile === "smartboard" ? lineWidth * 0.5 : lineWidth;

}

export function eraserRadiusForProfile(lineWidth: number, profile: LineProfile): number {

    // Tahtada palet değeri silginin çapıdır; eski 4 kat çap fazla alan siliyordu.
    return Math.max(4, lineWidth * (profile === "smartboard" ? 0.5 : 2));

}

export function textFontSizeForProfile(lineWidth: number, profile: LineProfile): number {

    if (profile !== "smartboard") {
        return 8 + lineWidth * 4;
    }

    const clamped = Math.min(Math.max(lineWidth, BOARD_MIN_TEXT_FONT_SIZE), BOARD_MAX_TEXT_FONT_SIZE);

    return clamped;

}
