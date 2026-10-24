# Agent guide: Temporada

Static site (`index.html`, `app-v2.js`, `style-v2.css`, generated `data/crops-v2.js`). No build step. Accessibility is a hard requirement: target WCAG 2.2 AA. Any UI change must keep these rules. Legacy `app.js`, `style.css`, and `data/produce.js` are frozen PWA-upgrade assets; do not change or remove them.

## Rules
- **Never convey info by color alone.** Active/inactive/unknown states have visible text; decorative emoji use `aria-hidden="true"`. New states need a text equivalent.
- **All UI strings live in `T` in `app-v2.js`**, including accessible names, statuses, errors, and visually hidden text. Keep English and Spanish complete and set `document.documentElement.lang` to the active language.
- **Semantics first:** one `<main>`, a skip link, one `<h1>`, and a real list of crop-card `<article>` elements. Preserve logical heading levels inside schedule details. Use `<button>`, `<input>`, `<details>`, and links, never clickable `div`/`span`.
- **Toggle buttons** use `aria-pressed`; button groups have an `aria-label`. Every input has an accessible name. Result changes are announced via the `#count` `aria-live="polite"` region.
- **Don't use `aria-label` on `span`** (unreliable); use visually hidden text. Decorative elements get `aria-hidden="true"`. Don't rely on `title` for meaning.
- **Keyboard:** everything is operable by keyboard. Keep the `:focus-visible` outline, preserve card DOM and focus across background/resume, and restore the originating source link after Back navigation. Never use `outline:none` without a replacement.
- **Contrast:** text >= 4.5:1, UI components/focus >= 3:1, in both light and dark themes (check both `light-dark()` values of any new `--var`).
- **Preferences:** respect `prefers-reduced-motion` and `forced-colors`; layout must work at 200% zoom and 320px width without page-level horizontal scrolling.
- Interactive targets >= 24x24 CSS px.

## Verify before finishing
1. Run `node --check app-v2.js`, `node --check sw.js`, `node --test tests/*.test.js`, `python3 scripts/build_data.py --check`, and `python3 -m unittest discover -s tests -p 'catalog*.py'`.
2. Do not run axe; the owner doesn't want it. Check both themes by hand.
3. Tab through the page; focus must be visible and order logical. Check source-link Back navigation.
4. Bump `CACHE` in `sw.js` whenever a cached asset changes, and verify the updated shell works offline.
