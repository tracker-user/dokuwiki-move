# Move plugin for DokuWiki — local fork

Local fork of the [Move plugin](https://www.dokuwiki.org/plugin:move) tracking upstream `fec3759` (2025-06-09).

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

### Code review pass (2026-05-28)

Applied as a separate pass over all PHP, JS, and translation files:

**Security**
- `action/progress.php`, `action/tree.php`, `action/tree.php`: replaced `$_SERVER['REMOTE_USER']` with `$INPUT->server->str('REMOTE_USER')` per DokuWiki input conventions; added `?? []` null guard on `$USERINFO['grps']`
- `action/rename.php` `renameOkay()`: same `$_SERVER` → `$INPUT` fix; removed `@` on `file_exists()`
- `action/rename.php` `handleAjaxMediaManager()`: `(array) $USERINFO['grps']` → `$USERINFO['grps'] ?? []`
- `helper/plan.php`: added `['allowed_classes' => false]` to `unserialize()` call
- `admin/tree.php` `html_list()`: wrapped `$item['id']` and page name outputs in `hsc()` to prevent XSS
- `script/rename.js`: error injection changed from `.html()` to `.text()` via `jQuery('<p>').text()`
- `script/progress.js`: AJAX error injection changed from `.html(…+data.error+…)` to `.text()` construction

**Correctness**
- `admin/tree.php`, `remote.php`: added missing `DOKU_INC` guards
- `admin/main.php`, `admin/tree.php`, `action/rewrite.php`: added `public` visibility to 9 methods that were missing it
- `helper/plan.php` `stepThroughDocuments()`: initialised `$return_items_run = 0` before the loop to prevent use of undefined variable on empty file

**Cleanup**
- Removed `@` error suppression: `@filesize()` → `file_exists() && filesize()`, `@file_exists()` → `file_exists()`, `@opendir()` → `opendir()`, `@unlink()` → `file_exists() && unlink()` across `helper/plan.php`, `helper/op.php`, `helper/file.php`, `action/rewrite.php`
- `script.js`: removed dead `json2.js` polyfill include (native JSON available in all supported browsers)
- `array()` → `[]` modernisation across all modified PHP files

**Translations**
- `lang/ru/lang.php`: added `extensionchange`, `js.moveButton`, `js.dialogIntro`
- `lang/ja/lang.php`: added `extensionchange`, `notallowed`, `js.moveButton`, `js.dialogIntro`

### Update suppression

`plugin.info.txt` `date` set to `2077-06-09` (original day/month, year bumped to 2077). Matches the convention used by our other forked plugins.

## What did NOT change from upstream

- All test files (`_test/`)
- `.github/workflows/`, `README` (original), `LICENSE`, `deleted.files`
- Admin SVG, image assets, config files (`conf/`)
- All language files except `lang/ru/lang.php` and `lang/ja/lang.php` (missing strings added)

## Compatibility

Tested on DokuWiki `2025-05-14b "Librarian"` per upstream's own compatibility list. The JS patch widens browser compatibility from "ES2022-required" to "ES6-and-newer."

## Restoring upstream

To undo the local changes:

1. Replace `plugin.info.txt` with upstream's version (date `2025-06-09`, original author line)
2. Replace `script/MoveMediaManager.js` with upstream's version (or run `git checkout` if your fork tracks the upstream repo)

Both files are documented inline with the rationale for the change.

## License

GPL 2, matching the original plugin (see `LICENSE`).
