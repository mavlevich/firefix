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
.github/workflows/
  ci.yml              tests, lint and build on every PR and push to main
  release.yml         signs the extension and publishes a release on a version tag
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

## Notes

Firefox does not keep a theme set by an extension across restarts, so the extension applies it again on startup.
On a cold start the default theme can show for a moment before Graphite is applied.
