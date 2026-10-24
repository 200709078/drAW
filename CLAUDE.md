# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

drAW is an interactive whiteboard/drawing app (Canvas 2D, strict TypeScript + Vite) shipped as a web app and an Electron desktop app (Linux `.deb`/AppImage, Windows NSIS). It is used in real classes on Pardus ETAP smart boards, so regressions there matter most. Siblings: `../drAW2D`, `../drAW3D` (if they ever move into one repository, drAW moves with them). The UI, test messages in pages, docs (`docs/*.md`, `tests/README.md`) and commit-facing notes are in **Turkish** — keep new user-facing strings and docs in Turkish.

## Commands

```bash
npm ci
npm run dev              # Vite dev server
npm run typecheck        # tsc for src/ (tsconfig.json) and electron/ (tsconfig.electron.json), both strict
npm run build            # typecheck + scripts/build-preloads.mjs + vite build → dist/
npm test                 # node --test tests/*.test.cjs (main-process/model tests, no browser)
npm run electron         # Electron against dist/ (run build first)
npm run dist             # build + electron-builder; on Linux → release/*.deb, *.AppImage
```

- Browser checks are HTML pages under `tests/` run against the Vite server (`tests/README.md`): `storage-ui.html`, `text-ui.html`, `guides-ui.html`, `quick-capture-ui.html`; add `?tahta=1` for board mode. CDP runners: `node tests/quick-capture-browser.cjs`, `node tests/text-browser.cjs` (start Vite with `--host 127.0.0.1`; `DRAW_TEST_URL` overrides the port). Toolbar position depends on window width, so run toolbar-related pages in a wide (~1600px, bottom) and a narrow (~760px, left) window.
- Real Electron checks: `npx electron tests/quick-capture-electron.cjs`, `tests/screen-keyboard-electron.cjs` (need a graphical session; from VS Code unset `ELECTRON_RUN_AS_NODE`).
- Releases: see the "Releases" section below.
- Tests use fake desktop storage and never touch the user's drawings.

## Releases

GitHub Releases is the only place packages are published; madematik.com and the README link to it.

- **Build:** `.github/workflows/release.yml` builds the Linux packages (`.deb`, AppImage) on `ubuntu-latest` and the Windows `.exe` on `windows-latest`. Never cross-build Windows from Linux (wine) and never upload or replace release assets by hand. Before packaging the Linux job runs `npm test` (Node tests). A failing step blocks the release.
- **Version:** `package.json` is the single source, so the local and GitHub versions are always the same. New release: `npm version patch` (or `minor`), then `git push --follow-tags`. The workflow fails if the tag `vX.Y.Z` differs from `package.json`.
- **Rebuild without a new version:** Actions → "Sürüm paketleri" → Run workflow replaces the assets of the current version (creates the release if missing). Build only, nothing published: `gh workflow run release.yml -f yayinla=false`, then `gh run download --name paket-Windows -D release`.
- **Asset names have no version:** `drAW-linux-amd64.deb`, `drAW-linux-x86_64.AppImage`, `drAW-win-x64.exe` (`build.artifactName` is `${productName}-${os}-${arch}.${ext}`), so `https://github.com/200709078/drAW/releases/latest/download/<name>` always fetches the newest release; madematik.com uses these links (drAW has no README; its release notes list them). Don't add the version back.
- **Notes and checksums:** `scripts/release-assets.mjs` writes `SHA256SUMS.txt` and the Turkish release notes (sizes, DEB dependencies and installed size read from the packages). Change the notes in the script, not on GitHub — the next run overwrites them.
- **Local copy:** `npm run dist*` output is for local testing only and differs byte-wise from the published files. To make `release/` match GitHub: `rm -rf release && gh release download vX.Y.Z -D release`, then `sha256sum -c SHA256SUMS.txt` inside `release/`.
- **Shared files:** the workflow and `scripts/release-assets.mjs` are identical copies in drAW, drAW2D and drAW3D (app name and version come from `package.json`) — change all three together. Actions: `checkout`/`setup-node`/`upload-artifact` v7, `download-artifact` v8 (Node 24).
- **Trigger quirk:** push a new or changed workflow file before the tag; a tag pushed in the same push as a new workflow did not trigger it.
- **Metadata:** license MIT (same text in all three repos), deb `Section: education`, `.desktop` categories include `Education`.

## Architecture

- `src/core/Application.ts` builds `ManagerContainer` (all managers/tools), `ZoomControls`, then `ToolbarPanel`. `HistoryManager` (snapshot undo/redo; change kinds `commit`/`reset`/`undo`/`redo`), `ViewportManager` (zoom 25–400 %, pan; tools use world coordinates), `PointerManager` (pointer events, coalesced events, two-finger pinch/pan, Ctrl+wheel; browser page zoom is blocked).
- `src/document/` model (`Document` → `Page` with strokes, `DocumentImage`, `TextObject`). `DocumentImage` ids are session-only symbols, not saved.
- `src/renderers/DocumentRenderer.ts` redraws the whole scene (known board-latency suspect, see roadmap); guides (none/grid/rows/columns) are drawn here.
- `src/tools/`: pen, highlighter, eraser (`PartialEraserTool` = Normal Silgi, `EraserTool` = Çizgi Silgi), selection, shapes, text. `src/core/EraserIdleReturn.ts`: both erasers return to the normal pen after 4 s idle.
- `src/platform/DeviceProfile.ts`: board detection (`?tahta=1`, or many touch points + large screen) and per-profile line widths/text sizes. Board mode zooms the toolbar by 1.2 (`body.board-mode .sidebar`), so toolbar geometry code converts screen px by the measured zoom (`toolbarZoom()`).
- `src/ui/ToolbarPanel.ts` (large; splitting it is on the roadmap): toolbar, flyout palettes (`flyouts` list: one open at a time, outside tap closes), color + separate previous-color badge button, guides palette, fixed layout (bottom if the natural row fits the window, else left; `updateToolbarLayout`), drAW handle (double click/tap folds the toolbar into the handle, single tap unfolds; folded items are `inert`), zoom controls lifted above a bottom toolbar when they would overlap (also with the drawings panel open).
- Storage: `src/storage/` (`DrawingRepository`, max **30 records**; new record written first, oldest removed after; failures never delete existing records) with web (`WebStorageProvider`) and Electron providers. `src/autosave/AutoSaveManager.ts`: saves every 10 s on AC power / 30 s on battery, saves before New Drawing / opening a record / shutdown; a save error stops those transitions; saves during a save are not lost.
- `src/photos/LinkedPhotoManager.ts` (+ `electron/photo-folder.ts`, Electron only): folder link. Photos are outside undo history; navigation keeps strokes. A linked photo is placed at half the screen height but never wider than the screen (16 px margins); after a width-capped photo the next one returns to the intended height unless the user resized it. The link survives opening other records (holder is "detached": plain image elsewhere, no arrows, undo never re-adds it); returning to the holder's record re-adopts it by record id + data URL; New Drawing from any record adds the photo after the linked one. Deleting the holder in its own record (eraser/selection) or manual unlink breaks the link. The normal eraser protects the linked holder.
- `src/capture/` + `electron/quick-capture/` (Windows/Linux desktop only; hidden on web/mobile): Tam Ekran / Alan screen capture. The selection window is prepared hidden when the palette opens (60 s) and created **without** `fullscreen` — on Linux a window created full screen is visible even with `show: false`; it goes full screen right before `show()`. The PNG is encoded once and sent as bytes; the window is shown only after the image is painted. Never read `webContents` of a window after its `closed` event (it throws); keep a reference. Step timings go to `quick-capture.log` in Electron's `logs` dir. Linux/X11 display-id quirks (truncated 32-bit ids, single-screen fallback) are handled in `service.ts`. Results arriving after the drawing changed are discarded.
- `src/platform/ScreenKeyboardBridge.ts` + `electron/screen-keyboard.ts`: on the Linux board profile only, text editing shows ETA Klavye or Onboard over D-Bus (Show, not Toggle; starts an installed one if none runs; never changes system settings).
- `electron/main.ts`: Electron runs the `.ts` files directly (Node type stripping, so only erasable TS syntax). Preloads must be CommonJS: `scripts/build-preloads.mjs` generates `electron/preload.cjs` and `electron/quick-capture/selection.cjs` — never edit the `.cjs` files by hand. Main window: frameless, fullscreen, `contextIsolation`; OS access only via preload/IPC.

## Conventions

- Don't cling to existing code: replace it with more efficient or cleaner code when that is better; the change must be tested and explained.
- `docs/yol-haritasi.md` holds pending work, user requests and physical-board verifications — record new requests there with a date; don't implement an item until the user asks. `docs/tahta-test-notlari.md` holds the user's smart-board observations.
- Packaging (`package.json` → `build`): package name `draw`, product/executable `drAW`, `.desktop` `Categories=Education;` + `Comment[tr]`, deb `Section: education`. Don't rename package/executable, change the license (MIT) or the user data format without asking. Pardus submission details are in the roadmap.
- `dist/`, `release/` are build outputs and not committed; `AGENTS*.md` files are git-ignored.
