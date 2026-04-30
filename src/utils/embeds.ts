import {
  EmbedBuilder, User,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags,
} from "discord.js";
import { BOT_COLOR, ERROR_COLOR, WARN_COLOR, SUCCESS_COLOR, INFO_COLOR, BOT_FOOTER, APP_NAME, LOGO_URL, SKULL_GIF_URL, LINE_SHORT } from "../config";
import { BANNER_GIF, LOGO } from "./branding";

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
    CLEAR: "🧹",
    "CLEAR ALL": "🧹",
  };
  return map[action] || "📋";
}

/* ═══════════════════════════════════════════════════════════
 *  Components V2 Container Helpers
 * ═══════════════════════════════════════════════════════════ */

/** V2 error container */
export function errorV2(message: string): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(ERROR_COLOR);
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### ✖ Error\n${message}\n-# ${LOGO} ${BOT_FOOTER}`
    )
  );
  return c;
}

/** V2 success container */
export function successV2(message: string): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(SUCCESS_COLOR);
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### ✔ Success\n${message}\n-# ${LOGO} ${BOT_FOOTER}`
    )
  );
  return c;
}

/** V2 moderation log container — posted to #bot-logs */
export function modLogV2(opts: {
  action: string;
  moderator: User;
  target: User;
  reason?: string;
  duration?: string;
  extra?: string;
}): ContainerBuilder {
  const emoji = actionEmoji(opts.action);
  const color =
    (opts.action === "BAN" || opts.action === "KICK") ? ERROR_COLOR :
    (opts.action === "MUTE" || opts.action === "WARN") ? WARN_COLOR :
    (opts.action === "UNMUTE" || opts.action === "UNBAN") ? SUCCESS_COLOR :
    BOT_COLOR;

  const c = new ContainerBuilder().setAccentColor(color);

  c.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(BANNER_GIF)
    )
  );

  const lines = [
    `# ${emoji} ${opts.action}`,
    `> **Target:** ${opts.target.tag} (<@${opts.target.id}>)`,
    `> **Moderator:** ${opts.moderator.tag} (<@${opts.moderator.id}>)`,
  ];
  if (opts.reason) lines.push(`> **Reason:** ${opts.reason}`);
  if (opts.duration) lines.push(`> **Duration:** ${opts.duration}`);
  if (opts.extra) lines.push(`> **Details:** ${opts.extra}`);
  lines.push(`\n-# ${LOGO} ${new Date().toLocaleString()} • ${BOT_FOOTER}`);

  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));

  return c;
}

/** V2 info container with banner */
export function infoV2(title: string, body: string): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(BOT_COLOR);

  c.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(BANNER_GIF)
    )
  );

  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${LOGO} ${title}\n${body}`)
  );

  c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  c.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
  );

  return c;
}

/** Shorthand: V2 reply options for ephemeral error */
export function ephemeralErrorV2(message: string) {
  return { components: [errorV2(message)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
}

/** Shorthand: V2 reply options for ephemeral success */
export function ephemeralSuccessV2(message: string) {
  return { components: [successV2(message)], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
}
