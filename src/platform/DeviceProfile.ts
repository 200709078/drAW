export type LineProfile = "standard" | "smartboard";

export const STANDARD_LINE_WIDTHS = [1, 2, 4, 6, 10, 16, 24, 32];
// Tahtada 24–90 (varsayılan 42) kalem çok kalındı (28 Ekim 2026, tahtada); parmak 0,5 basınçla
// çizdiği için varsayılan 16 tahtada yaklaşık 8 px'lik çizgi verir.
export const SMARTBOARD_LINE_WIDTHS = [6, 8, 12, 16, 20, 28, 40, 56];
export const STANDARD_DEFAULT_LINE_WIDTH = 6;
export const SMARTBOARD_DEFAULT_LINE_WIDTH = 16;

// Tahtada silgi ve metin boyu kalemle incelmez: paletin her sırası eski boyunu korur
// (kullanıcı kararı, 28 Ekim 2026: "silgi boyutu aynı kalsın, kalem boyutu düşebilir").
const SMARTBOARD_SIZE_STEPS = [24, 30, 36, 42, 50, 56, 70, 90];

/** The board size a palette width stands for: its former value at the same position. */
function boardSizeStep(lineWidth: number): number {
    const index = SMARTBOARD_LINE_WIDTHS.indexOf(lineWidth);
    return index >= 0 ? SMARTBOARD_SIZE_STEPS[index]! : lineWidth;
}

// Tahtada metin boyu paletin boy değerine eşitlenir, bu aralıkta tutulur.
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

    // Tahtada silgi çapı paletin eski boy değerinden %10 büyüktür.
    const radius = profile === "smartboard"
        ? Math.max(4, boardSizeStep(lineWidth) * 0.5)
        : Math.max(4, lineWidth * 2);

    return profile === "smartboard" ? radius * 1.1 : radius;

}

export function normalEraserRadiusForProfile(lineWidth: number, profile: LineProfile): number {

    const radius = eraserRadiusForProfile(lineWidth, profile);

    return profile === "smartboard" ? radius * 1.1 : radius;

}

export function textFontSizeForProfile(lineWidth: number, profile: LineProfile): number {

    if (profile !== "smartboard") {
        return 8 + lineWidth * 4;
    }

    const clamped = Math.min(Math.max(boardSizeStep(lineWidth), BOARD_MIN_TEXT_FONT_SIZE), BOARD_MAX_TEXT_FONT_SIZE);

    return clamped;

}
