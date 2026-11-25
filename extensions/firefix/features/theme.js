// Graphite: pure black tab strip for OLED screens with industrial graphite panels.
// Keys are described in the MDN docs for the "theme" manifest key.

// Graphite scale, darkest to lightest.
const G0 = "#000000"; // tab strip, OLED black
const G1 = "#17181b"; // toolbar plate and the selected tab
const G2 = "#1f2124"; // menus and the address field
const G3 = "#2b2d31"; // hover, highlights
const G4 = "#3a3d42"; // edges and pressed buttons
const G5 = "#5b5f67"; // focus edge, selected tab line

const TEXT = "#e4e5e7";
const TEXT_DIM = "#8b8e94";
const ICONS = "#a9acb2";

export const GRAPHITE = {
  colors: {
    frame: G0,
    frame_inactive: G0,
    tab_background_text: TEXT_DIM,
    tab_selected: G1,
    tab_text: TEXT,
    tab_line: G5,
    tab_loading: G5,

    toolbar: G1,
    toolbar_text: TEXT,
    toolbar_top_separator: G0,
    toolbar_bottom_separator: G4,
    toolbar_vertical_separator: G4,
    icons: ICONS,
    icons_attention: TEXT,
    button_background_hover: G3,
    button_background_active: G4,

    toolbar_field: G2,
    toolbar_field_text: TEXT,
    toolbar_field_border: G4,
    toolbar_field_focus: G2,
    toolbar_field_text_focus: "#ffffff",
    toolbar_field_border_focus: G5,
    toolbar_field_highlight: G4,
    toolbar_field_highlight_text: "#ffffff",

    popup: G2,
    popup_text: TEXT,
    popup_border: G4,
    popup_highlight: G3,
    popup_highlight_text: "#ffffff",

    sidebar: G0,
    sidebar_text: TEXT,
    sidebar_border: G4,
    sidebar_highlight: G3,
    sidebar_highlight_text: "#ffffff",

    ntp_background: G0,
    ntp_text: TEXT,
  },
  properties: {
    color_scheme: "dark",
    content_color_scheme: "system",
  },
};

// Turning the theme off gives control back to the theme picked in about:addons.
export async function apply(enabled) {
  if (enabled) {
    await browser.theme.update(GRAPHITE);
  } else {
    await browser.theme.reset();
  }
}
