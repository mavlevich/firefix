// Builds the Firefox profile that `npm run dev` starts with: a copy of profile/
// (user.js and chrome/userChrome.css). web-ext copies it again into a temporary
// profile on every run, so the dev browser never writes back here.

import { cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function buildDevProfile(source, target) {
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL("../", import.meta.url);
  buildDevProfile(fileURLToPath(new URL("profile", root)), fileURLToPath(new URL(".dev-profile", root)));
}
