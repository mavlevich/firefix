# Firefix

Firefox, fixed. One extension that collects my tweaks for Firefox: a theme, tab and bookmark helpers, small speed-ups.
Every feature can be switched on and off from the toolbar button.

## Features

| Feature | Status |
|---|---|
| Graphite theme: pure black background for OLED screens with graphite elements | ready |
| Tab auto-unload | planned |
| Duplicate tabs | planned |
| Bookmarks | planned |

## Layout

```
extensions/firefix/
  manifest.json       extension manifest (Manifest V3)
  background.js       applies enabled features on startup and on change
  features/
    registry.js       list of all features shown in the popup
    theme.js          Graphite colors
  lib/settings.js     feature on/off state in browser.storage
  popup/              toolbar popup with the feature switches
  _locales/           English and Russian texts
  icons/
test/                 unit tests (Vitest)
```

### Adding a feature

1. Create `features/<name>.js` that exports `apply(enabled)`.
2. Add it to `features/registry.js`.
3. Add its title and description to every file in `_locales/`.

## Development

Requires Firefox and Node.js 22 or newer.

```bash
npm install
```

| Command | What it does |
|---|---|
| `npm run dev` | Starts a separate Firefox with a clean temporary profile and the extension loaded. Saving a file reloads it. Your normal profile is not touched. |
| `npm test` | Runs unit tests. |
| `npm run lint` | Checks the extension with the same validator that addons.mozilla.org uses. |
| `npm run build` | Packs the extension into `dist/`. |

### Try it in your normal profile

Without signing, Firefox keeps the extension only until the next restart:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on" and pick `extensions/firefix/manifest.json`.

A permanent install needs a signed package. Signing will be set up later.

## Notes

Firefox does not keep a theme set by an extension across restarts, so the extension applies it again on startup.
On a cold start the default theme can show for a moment before Graphite is applied.
