# Extension module

**Runtime/build owner: Person 3. UI owner: Kripa.** Read [Person 3 prompts](../../teams/03_extension.md) and [contracts](../../docs/contracts.md).

Person 3 owns manifest, HTML entrypoints, bundler, background, content, overlay, adapters, and tests. Kripa exclusively owns src/popup and src/options. Agree on UI mount exports before editing either side.

Bundle worker as an extension module and content as a standalone injected bundle. Copy HTML, CSS, icons, and manifest into dist. Never ship development-server imports or remotely executed scripts. Load this production dist unpacked.

Core checks: user-enable, repeated injection, cleanup, two-page discovery, cancellation, at-most-once action, keyboard/native fallback, and worker restart. The local pointer engine must work without the service.

## Build, Load, and Test Instructions

### 1. Build
Inside `apps/extension/`:
```bash
npm install
npm run build
```
This runs `node build.mjs` using `esbuild` to compile:
- `src/background/serviceWorker.ts` -> `dist/worker.js` (ES Module)
- `src/content/index.ts` -> `dist/content.js` (Standalone IIFE for top-frame injection)
- `src/entrypoints/popup.tsx` -> `dist/popup.js` (ES Module)
- `src/entrypoints/options.tsx` -> `dist/options.js` (ES Module)
And copies `manifest.json`, `popup.html`, `options.html`, and `assets/` into `apps/extension/dist/`.

### 2. Load Unpacked in Chrome
1. Open Google Chrome (v116+).
2. Navigate to `chrome://extensions`.
3. Enable **Developer mode** toggle at the top right.
4. Click **Load unpacked** and select `apps/extension/dist/`.
5. Pin the SteadyHand extension icon in the toolbar.

### 3. Automated Tests
To run the automated risk test suite:
```bash
npm test
```
Tests in `tests/extension/` verify:
- At-most-once dwell activation invariant.
- Dwell cancellation on cursor exit, Escape, window blur, and scroll.
- Exclusion of submit buttons and non-dwellable controls from dwell.
- Ambiguity margin arbitration.
- Target classification and element policy.
- Settings store persistence and recovery across service worker restart.

