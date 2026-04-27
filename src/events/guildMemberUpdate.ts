import { GuildMember, PartialGuildMember, Client, EmbedBuilder, TextChannel } from "discord.js";
import { CHANNELS, PREMIUM_COLOR, BOT_FOOTER, LOGO_URL, SKULL_GIF_URL, LINE_SHORT, APP_NAME } from "../config";
import { logText } from "../utils/logger";

export async function handleGuildMemberUpdate(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
  client: Client
) {
  // Detect new boost
  const wasBoosting = oldMember.premiumSince !== null && oldMember.premiumSince !== undefined;
  const isBoosting = newMember.premiumSince !== null && newMember.premiumSince !== undefined;

  if (!wasBoosting && isBoosting) {
    await handleNewBoost(newMember, client);
  }
}

async function handleNewBoost(member: GuildMember, client: Client) {
  const channelId = CHANNELS.BOOSTERS || CHANNELS.CHAT;
  if (!channelId) return;

  const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel) return;

  const boostCount = member.guild.premiumSubscriptionCount || 0;

  const embed = new EmbedBuilder()
    .setColor(PREMIUM_COLOR)
    .setAuthor({ name: `${APP_NAME} — Server Boost`, iconURL: LOGO_URL })
    .setTitle(`☠️  ${member.user.displayName} boosted!`)
    .setDescription([
      `*${LINE_SHORT}*`,
      "",
      `> **${member.user.tag}** just boosted the server!`,
      "",
      "```ansi",
      "\u001b[0;35m╔══════════════════════════════════╗",
      `\u001b[0;35m║  \u001b[1;35m💎 BOOST INFO\u001b[0;35m`,
      `\u001b[0;35m║  \u001b[0;37mTotal Boosts: ${boostCount}`,
      `\u001b[0;35m║  \u001b[0;37mServer Level: ${member.guild.premiumTier}`,
      "\u001b[0;35m╚══════════════════════════════════╝",
      "```",
      "",
      "> 💜 Thank you for your support!",
      "",
      `*${LINE_SHORT}*`,
    ].join("\n"))
    .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
    .setImage(SKULL_GIF_URL)
    .setFooter({ text: `${boostCount} boosts • ${BOT_FOOTER}`, iconURL: LOGO_URL })
    .setTimestamp();

  try {
    await channel.send({ content: `${member}`, embeds: [embed] });
  } catch {}

  await logText(`� **${member.user.tag}** boosted the server! (${boostCount} boosts, Level ${member.guild.premiumTier})`);
}
