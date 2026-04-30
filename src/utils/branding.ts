/**
 * Shared branding constants for all Components V2 panels.
 * Import these everywhere to keep banner + logo consistent.
 */
import { Guild } from "discord.js";

/** Animated toxic skull banner — used on all major panels */
export const BANNER_GIF = "https://res.cloudinary.com/db4mpxc2k/image/upload/v1777332752/toxic_skull_banner_dumql1.gif";

/** Custom server emoji IDs — hardcoded fallbacks for critical emojis */
export const EMOJI = {
  logo: { id: "1498466667242721390", name: "toxiclinks" },
  support: { id: "1498458293767634995", name: "Support" },
  store: { id: "1498458184942227559", name: "store" },
  verified: { id: "1498458263841145032", name: "Verifiedbadgeapplication" },
  billing: { id: "1498458208283656323", name: "purshacebilling" },
};

/** Shorthand for logo emoji markdown */
export const LOGO = `<:${EMOJI.logo.name}:${EMOJI.logo.id}>`;

/** All custom emoji names used across the bot */
export const EMOJI_NAMES = {
  logo: "toxiclinks",
  dashboard: "dashboard",
  needhelp: "needhelp",
  note: "Note",
  shop: "shop",
  support: "Support",
  verified: "Verifiedbadgeapplication",
  verifiedBadge: "verifiedbadge",
  website: "website",
  logoNoBg: "Logowithoutbackground",
  store: "store",
  billing: "purshacebilling",
  accountRecovery: "accountrecovery",
};

/** Resolve a server emoji by name → `<:name:id>` string, or Unicode fallback */
export function guildEmoji(guild: Guild | null | undefined, name: string, fallback = ""): string {
  if (!guild) return fallback;
  const e = guild.emojis.cache.find(em => em.name === name);
  return e ? `<:${e.name}:${e.id}>` : fallback;
}

/** Resolve emoji object for button `.setEmoji()` → `{ id, name }` or undefined */
export function guildEmojiObj(guild: Guild | null | undefined, name: string): { id: string; name: string } | undefined {
  if (!guild) return undefined;
  const e = guild.emojis.cache.find(em => em.name === name);
  return e ? { id: e.id, name: e.name! } : undefined;
}
