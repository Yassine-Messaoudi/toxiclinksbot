import { GuildMember, PartialGuildMember, Client, EmbedBuilder, TextChannel } from "discord.js";
import { CHANNELS, BOT_FOOTER, GOODBYE_COLOR, LOGO_URL, SKULL_GIF_URL, LINE_SHORT, APP_NAME } from "../config";
import { logText } from "../utils/logger";

export async function handleGuildMemberRemove(
  member: GuildMember | PartialGuildMember,
  client: Client
) {
  const channelId = CHANNELS.GOODBYE || CHANNELS.CHAT;
  if (!channelId) return;

  const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel) return;

  const remaining = member.guild.memberCount;
  const joinedAt = (member as GuildMember).joinedTimestamp;
  const stayDays = joinedAt ? Math.floor((Date.now() - joinedAt) / 86400000) : null;

  const embed = new EmbedBuilder()
    .setColor(GOODBYE_COLOR)
    .setAuthor({
      name: `${APP_NAME} — Goodbye`,
      iconURL: LOGO_URL,
    })
    .setTitle(`${member.user?.displayName || "Unknown"} left ☠️`)
    .setDescription([
      `> **${member.user?.tag || "Unknown"}** has left the server.`,
      "",
      `\`\`\`ansi`,
      `\u001b[0;31m╔════════════════════════════╗`,
      `\u001b[0;31m║  \u001b[1;31m💀 Member Lost\u001b[0;31m`,
      stayDays !== null ? `\u001b[0;31m║  \u001b[0;37mStayed for: ${stayDays} days` : null,
      `\u001b[0;31m║  \u001b[0;37mRemaining: ${remaining.toLocaleString()}`,
      `\u001b[0;31m╚════════════════════════════╝`,
      `\`\`\``,
      "",
      `*${LINE_SHORT}*`,
    ].filter(Boolean).join("\n"))
    .setThumbnail(member.user?.displayAvatarURL({ size: 256 }) || SKULL_GIF_URL)
    .setFooter({ text: `${remaining.toLocaleString()} members remaining • ${BOT_FOOTER}`, iconURL: LOGO_URL })
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
  } catch {}

  await logText(`� **${member.user?.tag || "Unknown"}** left the server (${remaining} members)`);
}
