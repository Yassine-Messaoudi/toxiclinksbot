/**
 * Central bot configuration. Channel/role IDs are loaded from env so the same
 * codebase works across dev and production servers.
 */

export const BOT_COLOR = 0x39ff14; // Toxic green
export const TOXIC_DARK = 0x0d1117; // Dark background
export const TOXIC_GLOW = 0x00ff88; // Glow green
export const ERROR_COLOR = 0xff3333;
export const WARN_COLOR = 0xfbbf24;
export const SUCCESS_COLOR = 0x39ff14;
export const INFO_COLOR = 0x00d4ff;
export const PREMIUM_COLOR = 0xa855f7;
export const GOODBYE_COLOR = 0x8b0000;

export const APP_URL = process.env.APP_URL || "https://toxiclinks.gg";
export const APP_NAME = "ToxicLinks";
export const BOT_FOOTER = "⚡ ToxicLinks • toxiclinks.xyz";

/** Decorative line separators for embed descriptions */
export const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
export const LINE_SHORT = "━━━━━━━━━━━━━━━━━━━━";
export const TOXIC_BAR = "▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰";

/** Branding images — used in embeds. Falls back to GitHub raw if APP_URL isn't set. */
export const LOGO_URL = `${process.env.APP_URL || "https://toxiclinks.gg"}/logo.png`;
export const SKULL_GIF_URL = `${process.env.APP_URL || "https://toxiclinks.gg"}/toxic_skull_variant_2.gif`;

/** Channel IDs — set via env or leave empty to disable that feature */
export const CHANNELS = {
  // info
  ANNOUNCEMENTS: process.env.CH_ANNOUNCEMENTS || "",
  UPDATES: process.env.CH_UPDATES || "",
  GIVEAWAYS: process.env.CH_GIVEAWAYS || "",
  BOOSTERS: process.env.CH_BOOSTERS || "",
  POLLS: process.env.CH_POLLS || "",
  STATUS: process.env.CH_STATUS || "",
  RULES: process.env.CH_RULES || "",
  // support
  TICKET_SUPPORT: process.env.CH_TICKET_SUPPORT || "",
  // guns
  SUGGESTIONS: process.env.CH_SUGGESTIONS || "",
  // main
  CHAT: process.env.CH_CHAT || "",
  BIO_LINKS: process.env.CH_BIO_LINKS || "",
  BIO_TEMPLATES: process.env.CH_BIO_TEMPLATES || "",
  CMDS: process.env.CH_CMDS || "",
  // staff
  STAFF_CHAT: process.env.CH_STAFF_CHAT || "",
  BOT_LOGS: process.env.CH_BOT_LOGS || "",
  // welcome / leave
  WELCOME: process.env.CH_WELCOME || "",
  GOODBYE: process.env.CH_GOODBYE || "",
  // assets
  BACKGROUNDS: process.env.CH_BACKGROUNDS || "",
  PFPS: process.env.CH_PFPS || "",
  BANNERS: process.env.CH_BANNERS || "",
  CURSORS: process.env.CH_CURSORS || "",
  ICONS: process.env.CH_ICONS || "",
  AUDIOS: process.env.CH_AUDIOS || "",
  CUSTOM_FONTS: process.env.CH_CUSTOM_FONTS || "",
};

/** Asset channel name → config key mapping */
export const ASSET_CHANNEL_MAP: Record<string, string> = {
  backgrounds: CHANNELS.BACKGROUNDS,
  pfps: CHANNELS.PFPS,
  banners: CHANNELS.BANNERS,
  cursors: CHANNELS.CURSORS,
  icons: CHANNELS.ICONS,
  audios: CHANNELS.AUDIOS,
  "custom-fonts": CHANNELS.CUSTOM_FONTS,
};

/** Role IDs */
export const ROLES = {
  STAFF: process.env.ROLE_STAFF || "",
  MOD: process.env.ROLE_MOD || "",
  ADMIN: process.env.ROLE_ADMIN || "",
  PREMIUM: process.env.ROLE_PREMIUM || "",
  VERIFIED: process.env.ROLE_VERIFIED || "",
  BOOSTER: process.env.ROLE_BOOSTER || "",
  MEMBER: process.env.ROLE_MEMBER || "",
  MUTED: process.env.ROLE_MUTED || "",
};

export const GUILD_ID = process.env.GUILD_ID || "";
