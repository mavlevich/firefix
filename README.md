# Firefix

Firefox, fixed. One extension that collects my tweaks for Firefox: a theme, tab and bookmark helpers, small speed-ups.
Every extension feature can be switched on and off from the toolbar button.
Browser UI changes that an extension cannot make live in `userChrome.css`.

## Features

| Feature | Status |
|---|---|
| Graphite theme: pure black background for OLED screens with graphite elements | ready |
| Tab auto-unload | planned |
| Duplicate tabs | planned |
| Bookmarks | planned |
| Chrome-style tabs (`userChrome.css`): tabs shrink down to the favicon instead of scrolling | ready |

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
profile/
  user.js             prefs for the Firefox profile
  chrome/
    userChrome.css    browser UI changes
scripts/
  dev-profile.mjs     builds the profile that `npm run dev` starts with
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
| `npm run dev` | Starts a separate Firefox with a temporary copy of `profile/` and the extension loaded. Saving an extension file reloads it. `userChrome.css` is read only at startup, so restart the command after changing it. Your normal profile is not touched. |
| `npm test` | Runs unit tests. |
| `npm run lint` | Checks the extension with the same validator that addons.mozilla.org uses. |
| `npm run build` | Packs the extension into `dist/`. |

### Try it in your normal profile

Without signing, Firefox keeps the extension only until the next restart:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on" and pick `extensions/firefix/manifest.json`.

A permanent install needs a signed package. Signing will be set up later.

## Browser UI (userChrome.css)

`profile/chrome/userChrome.css` changes parts of the Firefox window that the theme API does not cover.
Right now it makes horizontal tabs work like in Chrome: they keep shrinking down to the favicon,
narrow tabs show only the favicon, and a very narrow selected tab shows its close button instead.
The tab strip starts to scroll only when even favicon-sized tabs do not fit. Pinned tabs are not changed.
Thin lines separate the tabs, and the selected and hovered tabs have no line on either side.
Tabs and toolbar buttons use `--firefix-radius` (8 px) and the address bar uses
`--firefix-radius-large` (10 px), instead of the 24 px Firefox uses. The tab close button stays round.

Firefox reads `userChrome.css` only at startup. To tune it live, open the Browser Toolbox
(Tools, Browser Tools, Browser Toolbox), edit the styles there, then copy the result into the file.

### Install into your normal profile

1. Find your profile folder in `about:profiles` (the "Root Directory" of the profile in use).
2. Quit Firefox.
3. Copy `profile/user.js` and the `profile/chrome` folder into the profile folder.
   If the profile already has a `user.js`, add the lines from ours to it instead.
4. Start Firefox.

## Notes

Firefox does not keep a theme set by an extension across restarts, so the extension applies it again on startup.
On a cold start the default theme can show for a moment before Graphite is applied.
