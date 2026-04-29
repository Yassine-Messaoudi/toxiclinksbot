/**
 * Shared branding constants for all Components V2 panels.
 * Import these everywhere to keep banner + logo consistent.
 */

/** Animated toxic skull banner — used on all major panels */
export const BANNER_GIF = "https://res.cloudinary.com/db4mpxc2k/image/upload/v1777332752/toxic_skull_banner_dumql1.gif";

/** Custom server emoji IDs — uploaded to the Discord server */
export const EMOJI = {
  logo: { id: "1498466667242721390", name: "toxiclinks" },
  support: { id: "1498458293767634995", name: "Support" },
  store: { id: "1498458184942227559", name: "store" },
  verified: { id: "1498458263841145032", name: "Verifiedbadgeapplication" },
  billing: { id: "1498458208283656323", name: "purshacebilling" },
};

/** Shorthand for logo emoji markdown */
export const LOGO = `<:${EMOJI.logo.name}:${EMOJI.logo.id}>`;
