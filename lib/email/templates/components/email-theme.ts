/** Hardcoded brand tokens for emails (CSS variables don't work in email clients). */
export const emailColors = {
  night: "#452c86",
  sunshine: "#c8312b",
  cream: "#fbf5ec",
  purple: "#452c86",
  white: "#ffffff",
  mutedPlum: "#5c549f",
  blush: "#f7c6da",
} as const;

/** Web-safe fallbacks for Bricolage Grotesque (display) and Catamaran (body). */
export const emailFonts = {
  display:
    "'Bricolage Grotesque', 'Trebuchet MS', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  body: "Catamaran, 'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const;
