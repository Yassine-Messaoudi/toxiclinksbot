import { EmbedBuilder, User } from "discord.js";
import { BOT_COLOR, ERROR_COLOR, WARN_COLOR, SUCCESS_COLOR, INFO_COLOR, BOT_FOOTER, APP_NAME, LOGO_URL } from "../config";

/** Branded embed with toxic green accent + logo */
export function toxicEmbed() {
  return new EmbedBuilder()
    .setColor(BOT_COLOR)
    .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
    .setTimestamp();
}

/** Error embed */
export function errorEmbed(message: string) {
  return new EmbedBuilder()
    .setColor(ERROR_COLOR)
    .setDescription(`❌ ${message}`)
    .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
    .setTimestamp();
}

/** Warning embed */
export function warnEmbed(message: string) {
  return new EmbedBuilder()
    .setColor(WARN_COLOR)
    .setDescription(`⚠️ ${message}`)
    .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
    .setTimestamp();
}

/** Success embed */
export function successEmbed(message: string) {
  return new EmbedBuilder()
    .setColor(SUCCESS_COLOR)
    .setDescription(`✅ ${message}`)
    .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
    .setTimestamp();
}

/** Info embed */
export function infoEmbed(title: string, description: string) {
  return new EmbedBuilder()
    .setColor(INFO_COLOR)
    .setTitle(title)
    .setDescription(description)
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
  const embed = new EmbedBuilder()
    .setColor(
      opts.action === "BAN" ? ERROR_COLOR :
      opts.action === "KICK" ? ERROR_COLOR :
      opts.action === "MUTE" ? WARN_COLOR :
      opts.action === "WARN" ? WARN_COLOR :
      opts.action === "UNMUTE" ? SUCCESS_COLOR :
      opts.action === "UNBAN" ? SUCCESS_COLOR :
      INFO_COLOR
    )
    .setTitle(`${actionEmoji(opts.action)} ${opts.action}`)
    .addFields(
      { name: "User", value: `${opts.target.tag} (${opts.target.id})`, inline: true },
      { name: "Moderator", value: `${opts.moderator.tag}`, inline: true },
    )
    .setThumbnail(opts.target.displayAvatarURL())
    .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
    .setTimestamp();

  if (opts.reason) embed.addFields({ name: "Reason", value: opts.reason });
  if (opts.duration) embed.addFields({ name: "Duration", value: opts.duration, inline: true });
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
