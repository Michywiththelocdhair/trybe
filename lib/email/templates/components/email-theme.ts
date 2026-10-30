/** Hardcoded brand tokens for emails (CSS variables don't work in email clients). */
export const emailColors = {
  night: "#24123f",
  sunshine: "#ffd447",
  cream: "#fff6cf",
  purple: "#62358c",
  white: "#ffffff",
  mutedPlum: "#5a4b70",
  blush: "#f4e7f3",
} as const;

/** Web-safe fallbacks for Bricolage Grotesque (display) and Catamaran (body). */
export const emailFonts = {
  display:
    "'Bricolage Grotesque', 'Trebuchet MS', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  body: "Catamaran, 'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const;
