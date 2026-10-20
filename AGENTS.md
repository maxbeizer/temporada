# Agent guide: Temporada

Static site (`index.html`, `app.js`, `style.css`, generated `data/produce.js`). No build step. Accessibility is a hard requirement: target WCAG 2.2 AA. Any UI change must keep these rules.

## Rules
- **Never convey info by color alone.** Every in-season cell has visually hidden text (`.vh`: "in season" / "not in season"); the current month column has "(current month)". New states need a text equivalent.
- **All UI strings live in `T` in `app.js`, in both `es` and `en`**, including aria-labels, captions, and visually hidden text. Keep `document.documentElement.lang` in sync; mark opposite-language labels (e.g. the language button) with `lang`.
- **Semantics first:** one `<main>`, a skip link, one `<h1>`, a real `<table>` with `<caption>`, `scope` on every `<th>` (`rowgroup` for group headers, one `<tbody>` per group). Use `<button>`/`<input>`, never clickable `div`/`span`.
- **Toggle buttons** use `aria-pressed`; button groups have an `aria-label`. Every input has an accessible name. Result changes are announced via the `#count` `aria-live="polite"` region.
- **Don't use `aria-label` on `td`/`span`** (unreliable); use visually hidden text. Decorative elements get `aria-hidden="true"`. Don't rely on `title` for meaning.
- **Keyboard:** everything operable by keyboard; the scrollable table wrapper keeps `tabindex="0"`, `role="region"` and a label. Keep the `:focus-visible` outline; never `outline:none` without a replacement.
- **Contrast:** text >= 4.5:1, UI components/focus >= 3:1, in both light and dark themes (check both `light-dark()` values of any new `--var`).
- **Preferences:** respect `prefers-reduced-motion` and `forced-colors`; layout must work at 200% zoom and 320px width (table scrolls inside its wrapper).
- Interactive targets >= 24x24 CSS px.

## Verify before finishing
1. `node --check app.js`.
2. Do not run axe; the owner doesn't want it. Check by hand instead (both themes, both languages).
3. Tab through the page; focus must be visible and order logical.
