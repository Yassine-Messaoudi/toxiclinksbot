import { GuildMember, Client, EmbedBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { CHANNELS, ROLES, BOT_COLOR, APP_URL, BOT_FOOTER, LOGO_URL, SKULL_GIF_URL, LINE, APP_NAME } from "../config";
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
  const createdDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);

  const embed = new EmbedBuilder()
    .setColor(BOT_COLOR)
    .setAuthor({
      name: `${APP_NAME} — Welcome System`,
      iconURL: LOGO_URL,
    })
    .setTitle(`Welcome, ${member.user.displayName}! ☠️`)
    .setDescription([
      `> ${member} just joined the **toxic** side.`,
      "",
      `\`\`\`ansi`,
      `\u001b[0;32m╔══════════════════════════════════════╗`,
      `\u001b[0;32m║  \u001b[1;32m⚡ MEMBER #${memberCount.toLocaleString()}${ordinal}\u001b[0;32m`,
      `\u001b[0;32m║  \u001b[0;37mAccount Age: ${createdDays} days`,
      `\u001b[0;32m╚══════════════════════════════════════╝`,
      `\`\`\``,
      "",
      `🔗 **Create your profile** → **[toxiclinks.xyz](${APP_URL})**`,
      `📜 **Read the rules** → ${CHANNELS.RULES ? `<#${CHANNELS.RULES}>` : "#rules"}`,
      `💬 **Start chatting** → ${CHANNELS.CHAT ? `<#${CHANNELS.CHAT}>` : "#chat"}`,
      `🎫 **Need help?** → ${CHANNELS.TICKET_SUPPORT ? `<#${CHANNELS.TICKET_SUPPORT}>` : "#support"}`,
      "",
      `*${LINE}*`,
    ].join("\n"))
    .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
    .setImage(SKULL_GIF_URL)
    .setFooter({ text: `${memberCount.toLocaleString()} members • ${BOT_FOOTER}`, iconURL: LOGO_URL })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Create Profile")
      .setURL(`${APP_URL}/auth/signin`)
      .setStyle(ButtonStyle.Link)
      .setEmoji("☠️"),
    new ButtonBuilder()
      .setLabel("Website")
      .setURL(APP_URL)
      .setStyle(ButtonStyle.Link)
      .setEmoji("🔗"),
  );

  try {
    await channel.send({ content: `${member}`, embeds: [embed], components: [row] });
  } catch {}

  await logText(`☠️ **${member.user.tag}** joined the server (${memberCount} members)`);
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
