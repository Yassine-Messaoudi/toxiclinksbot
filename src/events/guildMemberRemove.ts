import { GuildMember, PartialGuildMember, Client, EmbedBuilder, TextChannel } from "discord.js";
import { CHANNELS, BOT_FOOTER, ERROR_COLOR } from "../config";
import { logText } from "../utils/logger";

export async function handleGuildMemberRemove(
  member: GuildMember | PartialGuildMember,
  client: Client
) {
  const channelId = CHANNELS.GOODBYE || CHANNELS.CHAT;
  if (!channelId) return;

  const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(ERROR_COLOR)
    .setTitle("Member Left 👋")
    .setDescription(`**${member.user?.tag || "Unknown"}** has left the server.`)
    .setThumbnail(member.user?.displayAvatarURL({ size: 128 }) || "")
    .setFooter({ text: `${member.guild.memberCount} members remaining • ${BOT_FOOTER}` })
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
  } catch {}

  await logText(`🚪 **${member.user?.tag || "Unknown"}** left the server (${member.guild.memberCount} members)`);
}
