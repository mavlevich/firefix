# Firefix

Firefox, fixed. One extension that collects my tweaks for Firefox: a theme, tab and bookmark helpers, small speed-ups.
Every extension feature can be switched on and off from the toolbar button.
Browser UI changes that an extension cannot make live in `userChrome.css`.

## Features

| Feature | Status |
|---|---|
| Graphite theme: pure black background for OLED screens with graphite elements | ready |
| Tab auto-unload | planned |
| Duplicate tabs: amber highlight on pages open more than once, count on the toolbar button (needs `userChrome.css`) | ready, off by default |
| Bookmarks | planned |
| Chrome-style tabs (`userChrome.css`): tabs shrink down to the favicon instead of scrolling | ready |

## Layout

```
.github/workflows/
  ci.yml              tests, lint and build on every PR and push to main
  release.yml         signs the extension and publishes a release on a version tag
extensions/firefix/
  manifest.json       extension manifest (Manifest V3)
  background.js       applies enabled features on startup and on change
  features/
    registry.js       list of all features shown in the popup
    theme.js          Graphite colors
    duplicates.js     marks duplicate pages, badge with the count
  lib/
    settings.js       feature on/off state in browser.storage
    duplicates.js     grouping by address, which tabs to mark (pure functions)
  popup/              toolbar popup with the feature switches
  _locales/           English and Russian texts
  icons/
profile/
  user.js             prefs for the Firefox profile
  chrome/
    userChrome.css    browser UI changes
scripts/
  dev-profile.mjs     builds the profile that `npm run dev` starts with
  dup-css.mjs         writes the duplicate group rules into userChrome.css
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
| `npm run sign` | Signs the extension on addons.mozilla.org. Used by the release workflow, needs AMO keys. |

### Try it in your normal profile

Without signing, Firefox keeps the extension only until the next restart:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on" and pick `extensions/firefix/manifest.json`.

A permanent install needs a signed package. Signed `.xpi` files are attached to
[releases](https://github.com/mavlevich/firefix/releases), open one in Firefox to install it.

## Releasing

Releases are signed on addons.mozilla.org (AMO) as unlisted. The add-on does not show up
in the store, AMO only signs it so Firefox can keep it installed.

### One-time setup

1. Sign in to AMO and create API keys at
   https://addons.mozilla.org/developers/addon/api/key/.
2. In the GitHub repo open Settings, Secrets and variables, Actions, and add two secrets:
   - `AMO_JWT_ISSUER`: the "JWT issuer" value.
   - `AMO_JWT_SECRET`: the "JWT secret" value.

### Each release

1. Bump `version` in `extensions/firefix/manifest.json` in a PR and merge it.
   AMO signs every version only once, so each release needs a new version.
2. Tag the merged commit with the same version and push the tag:

   ```bash
   git checkout main
   git pull
   git tag v0.1.1
   git push origin v0.1.1
   ```

3. The release workflow checks that the tag matches the manifest version, runs the tests,
   signs the extension and attaches the `.xpi` to a new GitHub Release.

The add-on id `firefix@firefix` in `manifest.json` must never change. AMO ties every
signed version to this id, and Firefox treats a new id as a different add-on.

## Browser UI (userChrome.css)

`profile/chrome/userChrome.css` changes parts of the Firefox window that the theme API does not cover.
Right now it makes horizontal tabs work like in Chrome: they keep shrinking down to the favicon,
narrow tabs show only the favicon, and a very narrow selected tab shows its close button instead.
The tab strip starts to scroll only when even favicon-sized tabs do not fit. Pinned tabs are not changed.
Thin lines separate the tabs, and the selected and hovered tabs have no line on either side.
Tabs and toolbar buttons use `--firefix-radius` (8 px) and the address bar uses
`--firefix-radius-large` (10 px), instead of the 24 px Firefox uses. The tab close button stays round.

### Duplicate tabs

An extension cannot style the native tabs, and `userChrome.css` cannot tell which tabs are duplicates.
So the extension puts an invisible prefix at the start of the title of every page that is open more
than once: U+2060 WORD JOINER and a two character group code made of U+2061 to U+2064. Every copy of
the same page gets the same code. Firefox copies the title into the tab label, and `userChrome.css`
matches the label:

- every duplicate tab has a small amber LED in its top right corner;
- when the selected or the hovered tab is a duplicate, all copies of that page get a thin amber
  edge with a soft glow, and their LEDs glow brighter. Copies of other pages stay quiet.

The color is `--firefix-dup`. The LED size, its distance from the corner and its glow are
`--firefix-dup-led-size`, `--firefix-dup-led-inset`, `--firefix-dup-led-glow` and
`--firefix-dup-led-glow-lit`.
There is one CSS selector per group code. They are generated by `scripts/dup-css.mjs`, and a test
checks that `userChrome.css` is up to date with the codes in `lib/duplicates.js`.

A group keeps its code while it exists, so closing one group does not change the others.
A new group takes the lowest free code.

Pages count as the same only when their addresses match exactly, as Firefox shows them.
Private windows and containers are kept apart.
The toolbar button shows how many extra copies are open.

The feature is off by default. Turning it on asks for access to all sites, which is needed to read
tab addresses and change page titles.

Known limits:

- No highlight on pages an extension may not change: `about:` pages, the PDF viewer, addons.mozilla.org.
  They still count on the badge.
- Only exact copies are found. The same page with a different `#fragment`, query or trailing
  slash is not a duplicate.
- There are 16 group codes. With more than 16 groups of duplicates at once, codes are used again,
  and two groups light up together.
- Unloaded tabs get the highlight when they load.
- The prefix is invisible but is part of the title, so it can end up in history and in the
  title of a bookmark made from a highlighted tab.
- Pages that were highlighted keep the prefix until reload when the extension is disabled or removed.

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
