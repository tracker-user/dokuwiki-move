# Move plugin for DokuWiki — local fork

Local fork of the [Move plugin](https://www.dokuwiki.org/plugin:move) tracking upstream `fec3759` (2025-06-09). This is a **near-version-pin** fork: only one file has been modified relative to upstream, plus the `plugin.info.txt` freeze.

## What changed in the local fork

### Functional change: ES2022 → ES5-compatible class privacy in `script/MoveMediaManager.js`

The other admin's patch (forwarded to me) converted all `#methodName` class private method declarations and call sites to `__methodName`. I reviewed and applied the patch — here's the reasoning.

**The problem.** `MoveMediaManager.js` uses [JavaScript class private methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements), an ECMAScript 2022 feature requiring:

|    Browser    | Minimum version | Released |
|:-------------:|:---------------:|:--------:|
| Chrome / Edge |       84        | Jul 2020 |
|    Firefox    |       90        | Jul 2021 |
|    Safari     |       15        | Sep 2021 |

If a browser doesn't understand the `#name` syntax, the whole file fails to parse with `SyntaxError`. That cascades — DokuWiki concatenates all `script/*.js` files into one big script via `/* DOKUWIKI:include */` directives, so one file's parse failure breaks *every* piece of move-plugin client-side JS on the page (tree manager, rename dialog, progress bar, the media-manager move button itself).

**The fix.** The patch replaces every `#methodName` with `__methodName`. This drops language-enforced privacy for the underscore-prefix convention — pure cosmetic privacy. Functionally identical because:

- The four affected methods (`addMoveButton`, `showDialog`, `buildForm`, `requestMove`) are only ever called from inside the class via `this.methodName.bind(this)`
- No external caller exists that would benefit from language-enforced privacy
- The bound-method pattern works exactly the same with either prefix

**Net effect.** The plugin's JS now parses on any browser supporting ES6 classes (released 2015-2016), instead of requiring ES2022. No behavioral change for users on modern browsers. Insurance against parse failure for users on older browsers, embedded webviews, mobile devices on outdated firmware, or any JS minifier that doesn't understand `#`.

Only `script/MoveMediaManager.js` needed patching — the other JS files (`tree.js`, `progress.js`, `rename.js`, `form.js`) use `#` only in CSS-selector strings (e.g. `jQuery('#plugin_move__tree')`), which are normal string literals and not affected.

### Update suppression

`plugin.info.txt` `date` set to `2077-06-09` (original day/month, year bumped to 2077). Matches the convention used by our other forked plugins.

## What did NOT change

Every other file is byte-identical to upstream `fec3759`:

- All PHP — 5,116 LOC across helpers, actions, admin pages, remote handlers
- All other JS files (`tree.js`, `progress.js`, `rename.js`, `form.js`, `json2.js`, top-level `script.js`)
- All CSS
- All 16 language directories
- All 9 PHP test files
- `.github/workflows/`, `README` (original), `LICENSE`, `deleted.files`
- Admin svg, image assets, config files

## Compatibility

Tested on DokuWiki `2025-05-14b "Librarian"` per upstream's own compatibility list. The JS patch widens browser compatibility from "ES2022-required" to "ES6-and-newer."

## Restoring upstream

To undo the local changes:

1. Replace `plugin.info.txt` with upstream's version (date `2025-06-09`, original author line)
2. Replace `script/MoveMediaManager.js` with upstream's version (or run `git checkout` if your fork tracks the upstream repo)

Both files are documented inline with the rationale for the change.

## License

GPL 2, matching the original plugin (see `LICENSE`).
