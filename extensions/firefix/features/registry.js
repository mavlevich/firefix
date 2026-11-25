import * as theme from "./theme.js";

// Every feature shown in the popup. A feature with ready: false is listed
// as "coming soon" and has no apply function yet.
// title and description are message keys from _locales.
export const FEATURES = [
  {
    id: "theme",
    title: "featureThemeTitle",
    description: "featureThemeDescription",
    default: true,
    ready: true,
    apply: theme.apply,
  },
  {
    id: "tabUnload",
    title: "featureTabUnloadTitle",
    description: "featureTabUnloadDescription",
    default: false,
    ready: false,
  },
  {
    id: "duplicates",
    title: "featureDuplicatesTitle",
    description: "featureDuplicatesDescription",
    default: false,
    ready: false,
  },
  {
    id: "bookmarks",
    title: "featureBookmarksTitle",
    description: "featureBookmarksDescription",
    default: false,
    ready: false,
  },
];
