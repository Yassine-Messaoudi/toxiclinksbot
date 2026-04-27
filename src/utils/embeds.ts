import { EmbedBuilder, User } from "discord.js";
import { BOT_COLOR, ERROR_COLOR, WARN_COLOR, SUCCESS_COLOR, INFO_COLOR, BOT_FOOTER, APP_NAME, LOGO_URL, SKULL_GIF_URL, LINE_SHORT } from "../config";

/** Branded embed with toxic green accent + logo + skull */
export function toxicEmbed() {
  return new EmbedBuilder()
    .setColor(BOT_COLOR)
    .setAuthor({ name: `${APP_NAME}`, iconURL: LOGO_URL })
    .setThumbnail(SKULL_GIF_URL)
    .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
    .setTimestamp();
}

/** Error embed */
export function errorEmbed(message: string) {
  return new EmbedBuilder()
    .setColor(ERROR_COLOR)
    .setAuthor({ name: `${APP_NAME} — Error`, iconURL: LOGO_URL })
    .setDescription([
      "```ansi",
      `\u001b[0;31m✖ \u001b[1;31m${message}`,
      "```",
    ].join("\n"))
    .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
    .setTimestamp();
}

/** Warning embed */
export function warnEmbed(message: string) {
  return new EmbedBuilder()
    .setColor(WARN_COLOR)
    .setAuthor({ name: `${APP_NAME} — Warning`, iconURL: LOGO_URL })
    .setDescription([
      "```ansi",
      `\u001b[0;33m⚠ \u001b[1;33m${message}`,
      "```",
    ].join("\n"))
    .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
    .setTimestamp();
}

/** Success embed */
export function successEmbed(message: string) {
  return new EmbedBuilder()
    .setColor(SUCCESS_COLOR)
    .setAuthor({ name: `${APP_NAME}`, iconURL: LOGO_URL })
    .setDescription([
      "```ansi",
      `\u001b[0;32m✔ \u001b[1;32m${message}`,
      "```",
    ].join("\n"))
    .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
    .setTimestamp();
}

/** Info embed */
export function infoEmbed(title: string, description: string) {
  return new EmbedBuilder()
    .setColor(INFO_COLOR)
    .setAuthor({ name: `${APP_NAME} — Info`, iconURL: LOGO_URL })
    .setTitle(`☠️  ${title}`)
    .setDescription([
      `*${LINE_SHORT}*`,
      "",
      description,
      "",
      `*${LINE_SHORT}*`,
    ].join("\n"))
    .setThumbnail(SKULL_GIF_URL)
    .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
    .setTimestamp();
}

/** Moderation action embed for bot-logs */
export function modLogEmbed(opts: {
  action: string;
  moderator: User;
  target: User;
  reason?: string;
  duration?: string;
  extra?: string;
}) {
  const color =
    opts.action === "BAN" ? ERROR_COLOR :
    opts.action === "KICK" ? ERROR_COLOR :
    opts.action === "MUTE" ? WARN_COLOR :
    opts.action === "WARN" ? WARN_COLOR :
    opts.action === "UNMUTE" ? SUCCESS_COLOR :
    opts.action === "UNBAN" ? SUCCESS_COLOR :
    INFO_COLOR;

  const ansiColor =
    (opts.action === "BAN" || opts.action === "KICK") ? "31" :
    (opts.action === "MUTE" || opts.action === "WARN") ? "33" :
    (opts.action === "UNMUTE" || opts.action === "UNBAN") ? "32" : "36";

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${APP_NAME} — Moderation`, iconURL: LOGO_URL })
    .setTitle(`${actionEmoji(opts.action)}  ${opts.action}`)
    .setDescription([
      "```ansi",
      `\u001b[0;${ansiColor}m╔══════════════════════════════╗`,
      `\u001b[0;${ansiColor}m║  \u001b[1;${ansiColor}m${opts.action}\u001b[0;${ansiColor}m`,
      `\u001b[0;${ansiColor}m║  \u001b[0;37mUser: ${opts.target.tag}`,
      `\u001b[0;${ansiColor}m║  \u001b[0;37mMod:  ${opts.moderator.tag}`,
      opts.reason ? `\u001b[0;${ansiColor}m║  \u001b[0;37mReason: ${opts.reason}` : null,
      opts.duration ? `\u001b[0;${ansiColor}m║  \u001b[0;37mDuration: ${opts.duration}` : null,
      `\u001b[0;${ansiColor}m╚══════════════════════════════╝`,
      "```",
    ].filter(Boolean).join("\n"))
    .setThumbnail(opts.target.displayAvatarURL())
    .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
    .setTimestamp();

  if (opts.extra) embed.addFields({ name: "Details", value: opts.extra });

  return embed;
}

function actionEmoji(action: string): string {
  const map: Record<string, string> = {
    BAN: "🔨",
    KICK: "👢",
    MUTE: "🔇",
    UNMUTE: "🔊",
    WARN: "⚠️",
    UNBAN: "✅",
    PURGE: "🗑️",
    TIMEOUT: "⏰",
  };
  return map[action] || "📋";
}
