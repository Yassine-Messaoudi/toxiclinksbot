/**
 * Shared branding constants for all Components V2 panels.
 * Import these everywhere to keep banner + logo consistent.
 *
 * ALL emoji resolution goes through the guild cache — no hardcoded IDs.
 * Only custom server emojis are used; no Unicode/random emojis.
 */
import { Guild } from "discord.js";

/** Animated toxic skull banner — used on all major panels */
export const BANNER_GIF = "https://res.cloudinary.com/db4mpxc2k/image/upload/v1777332752/toxic_skull_banner_dumql1.gif";

/** All custom emoji names used across the bot — must match server emoji names exactly */
export const EMOJI_NAMES = {
  logo: "toxiclinks",
  logoNoBg: "Logowithoutbackground",
  billing: "billing",
  needhelp: "needhelp",
  website: "web",
  leaderboard: "leadboard",
  note: "note",
  verified: "Verifiedbadgeapplication",
  ldboard: "ldboard",
  help: "help",
  reset: "reset",
  shop: "shop",
  warn: "warn",
  verif: "verif",
  x: "X_",
};

/** Resolve a server emoji by name → `<:name:id>` string, or empty string if not found */
export function guildEmoji(guild: Guild | null | undefined, name: string): string {
  if (!guild) return "";
  const e = guild.emojis.cache.find(em => em.name === name);
  return e ? `<:${e.name}:${e.id}>` : "";
}

/**
 * Resolve a server emoji by name → `<:name:id>` string, or a Unicode fallback
 * if not found. Use this in welcome/info panels so the message still renders
 * cleanly when a custom emoji is missing or hasn't been cached yet.
 */
export function guildEmojiOr(guild: Guild | null | undefined, name: string, fallback: string): string {
  return guildEmoji(guild, name) || fallback;
}

/** Resolve emoji object for button `.setEmoji()` → `{ id, name }` or undefined */
export function guildEmojiObj(guild: Guild | null | undefined, name: string): { id: string; name: string } | undefined {
  if (!guild) return undefined;
  const e = guild.emojis.cache.find(em => em.name === name);
  return e ? { id: e.id, name: e.name! } : undefined;
}

/** Resolve the ToxicLinks logo emoji for use in text — pass the guild */
export function logoEmoji(guild: Guild | null | undefined): string {
  return guildEmoji(guild, EMOJI_NAMES.logo);
}
