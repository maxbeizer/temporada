# Temporada

Mobile-first planting options and seasonal buying guidance for Belgrano, Buenos Aires. English-only, with emoji alongside crop names. Inspired by https://github.com/crittermike/planting-calendar; rebuilt here without location configuration, accounts, or tracking.

Plant opens by default; the last-used Plant/Buy view and theme are saved on this browser when storage is available. Each visit starts on the current Buenos Aires month. Browse months for current opportunities, or search any crop to inspect its annual schedule, including inactive months and unknown schedules. Market seasonality is independent of planting and is not a garden-harvest prediction.

## Run and maintain

No site build step or runtime dependencies. Serve the repository with `python3 -m http.server 8765 --bind 127.0.0.1` and visit http://127.0.0.1:8765/. Installation and offline support require HTTPS in production (localhost is also supported).

Edit source rows and metadata in `scripts/build_data.py`, then run `python3 scripts/build_data.py`. Do not edit generated `data/crops-v2.js` directly. See [catalog evidence and maintenance](docs/catalog.md) for source URLs, geographic limits, transcriptions, conflict decisions, and the browser data contract. Unsupported schedules remain unknown; national buying seasons do not establish local growing suitability or retail stock.

## Checks

- `node --check app-v2.js`
- `node --check sw.js`
- `node --test tests/*.test.js`
- `python3 scripts/build_data.py --check`
- `python3 -m unittest discover -s tests -p 'catalog*.py'`

Manually check keyboard focus/order, both themes, 320px layouts, 200% zoom, reduced motion, and forced colors. Do not run axe.

## PWA and deployment

The relative manifest, service worker, and asset paths support both domain-root hosting and a GitHub Pages project path. Existing deployment publishes the main branch to the configured custom domain.

The legacy `app.js`, `style.css`, and `data/produce.js` are frozen compatibility assets for installations still controlled by the original worker. Do not change or remove them: its stale-while-revalidate cache can refresh files independently, even when an installation skips intermediate releases. The rebuilt HTML uses separate `app-v2.js`, `style-v2.css`, and `data/crops-v2.js` paths so old HTML always receives compatible legacy assets.

The rebuilt HTML also carries an inline migration fallback. If the original worker serves rebuilt HTML while the v2 dependencies are unavailable, the page renders the legacy shell from those frozen cached assets instead of failing offline. Keep the fallback markup synchronized with the frozen legacy app contract until the original worker no longer needs migration support.

The service worker precaches the complete local shell and catalog as one versioned release. New workers wait until old controlled tabs close; close all Temporada tabs/windows and reopen to receive a waiting update. Do not force activation into open pages. Bump `CACHE` in `sw.js` whenever any cached asset changes; keep `SHELL` synchronized with local runtime assets. Old Temporada caches are removed on activation; unrelated caches are preserved. External source pages are not cached. Offline use requires one successful online visit first.

On iOS Safari, install through Share > Add to Home Screen; Chromium-based mobile browsers expose installation through their own menu or prompt. Install UI and standalone behavior vary by platform and require real-device verification; desktop emulation is not a substitute.
