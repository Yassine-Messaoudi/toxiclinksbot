import { GuildMember, Client, EmbedBuilder, TextChannel } from "discord.js";
import { CHANNELS, ROLES, BOT_COLOR, APP_URL, BOT_FOOTER, LOGO_URL, SKULL_GIF_URL } from "../config";
import { logText } from "../utils/logger";

export async function handleGuildMemberAdd(member: GuildMember, client: Client) {
  // Auto-role
  if (ROLES.MEMBER) {
    try {
      await member.roles.add(ROLES.MEMBER);
    } catch (err) {
      console.warn("[Bot] Failed to add member role:", (err as Error).message);
    }
  }

  // Welcome message
  const channelId = CHANNELS.WELCOME || CHANNELS.CHAT;
  if (!channelId) return;

  const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel) return;

  const memberCount = member.guild.memberCount;
  const ordinal = getOrdinal(memberCount);

  const embed = new EmbedBuilder()
    .setColor(BOT_COLOR)
    .setTitle("Welcome to ToxicLinks! 🎉")
    .setDescription([
      `Hey ${member}, welcome to the server!`,
      "",
      `You are the **${memberCount.toLocaleString()}${ordinal}** member!`,
      "",
      `🔗 Create your profile at **[toxiclinks.gg](${APP_URL})**`,
      `📜 Check out <#${CHANNELS.RULES || "rules"}> to get started`,
      `💬 Say hi in <#${CHANNELS.CHAT || "chat"}>`,
    ].join("\n"))
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setImage(SKULL_GIF_URL)
    .setFooter({ text: `Member #${memberCount} • ${BOT_FOOTER}`, iconURL: LOGO_URL })
    .setTimestamp();

  try {
    await channel.send({ content: `${member}`, embeds: [embed] });
  } catch {}

  await logText(`👋 **${member.user.tag}** joined the server (${memberCount} members)`);
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
