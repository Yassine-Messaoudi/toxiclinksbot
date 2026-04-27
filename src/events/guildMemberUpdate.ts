import { GuildMember, PartialGuildMember, Client, EmbedBuilder, TextChannel } from "discord.js";
import { CHANNELS, BOT_COLOR, PREMIUM_COLOR, BOT_FOOTER } from "../config";
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
    .setTitle("🚀 New Server Boost!")
    .setDescription([
      `**${member.user.tag}** just boosted the server!`,
      "",
      `We now have **${boostCount}** boost${boostCount !== 1 ? "s" : ""} (Level ${member.guild.premiumTier})`,
      "",
      "Thank you for your support! 💜",
    ].join("\n"))
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: BOT_FOOTER })
    .setTimestamp();

  try {
    await channel.send({ content: `${member}`, embeds: [embed] });
  } catch {}

  await logText(`🚀 **${member.user.tag}** boosted the server! (${boostCount} boosts, Level ${member.guild.premiumTier})`);
}
