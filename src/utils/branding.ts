/**
 * Shared branding constants for all Components V2 panels.
 * Import these everywhere to keep banner + logo consistent.
 *
 * ALL emoji resolution goes through the guild cache — no hardcoded IDs.
 * If the emoji isn't found on the server, a Unicode fallback is used.
 */
import { Guild } from "discord.js";

/** Animated toxic skull banner — used on all major panels */
export const BANNER_GIF = "https://res.cloudinary.com/db4mpxc2k/image/upload/v1777332752/toxic_skull_banner_dumql1.gif";

/** All custom emoji names used across the bot — must match server emoji names exactly */
export const EMOJI_NAMES = {
  logo: "toxiclinks",
  dashboard: "dashboard",
  needhelp: "needhelp",
  note: "note",
  shop: "shop",
  support: "Support",
  verified: "Verifiedbadgeapplication",
  verifiedBadge: "verifiedbadge",
  website: "web",
  logoNoBg: "Logowithoutbackground",
  store: "store",
  billing: "purshacebilling",
  accountRecovery: "accountrecovery",
  leaderboard: "leadboard",
  ldboard: "ldboard",
  help: "help",
  reset: "reset",
};

/** Unicode fallbacks when custom emoji can't be resolved */
export const UNICODE_FALLBACKS: Record<string, string> = {
  [EMOJI_NAMES.logo]: "☠️",
  [EMOJI_NAMES.logoNoBg]: "⚡",
  [EMOJI_NAMES.needhelp]: "❓",
  [EMOJI_NAMES.note]: "📜",
  [EMOJI_NAMES.shop]: "🛒",
  [EMOJI_NAMES.support]: "🎫",
  [EMOJI_NAMES.verified]: "✅",
  [EMOJI_NAMES.website]: "🌐",
  [EMOJI_NAMES.store]: "🏪",
  [EMOJI_NAMES.billing]: "💳",
  [EMOJI_NAMES.accountRecovery]: "🔑",
  [EMOJI_NAMES.leaderboard]: "🏆",
  [EMOJI_NAMES.ldboard]: "📊",
  [EMOJI_NAMES.help]: "📖",
  [EMOJI_NAMES.reset]: "🔄",
  [EMOJI_NAMES.dashboard]: "📋",
  [EMOJI_NAMES.verifiedBadge]: "✅",
};

/** Resolve a server emoji by name → `<:name:id>` string, or Unicode fallback */
export function guildEmoji(guild: Guild | null | undefined, name: string, fallback?: string): string {
  const fb = fallback ?? UNICODE_FALLBACKS[name] ?? "";
  if (!guild) return fb;
  const e = guild.emojis.cache.find(em => em.name === name);
  return e ? `<:${e.name}:${e.id}>` : fb;
}

/** Resolve emoji object for button `.setEmoji()` → `{ id, name }` or Unicode string */
export function guildEmojiObj(guild: Guild | null | undefined, name: string): { id: string; name: string } | string {
  const fb = UNICODE_FALLBACKS[name] ?? "⚡";
  if (!guild) return fb;
  const e = guild.emojis.cache.find(em => em.name === name);
  return e ? { id: e.id, name: e.name! } : fb;
}

/** Resolve the ToxicLinks logo emoji for use in text — pass the guild */
export function logoEmoji(guild: Guild | null | undefined): string {
  return guildEmoji(guild, EMOJI_NAMES.logo, "☠️");
}

/**
 * @deprecated Use `logoEmoji(guild)` instead. Kept for static contexts only.
 * This may show a broken emoji if the hardcoded ID is stale.
 */
export const LOGO = "☠️";
