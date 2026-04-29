import {
  GuildMember, PartialGuildMember, Client, TextChannel, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, ThumbnailBuilder,
} from "discord.js";
import { CHANNELS, PREMIUM_COLOR, BOT_FOOTER, APP_NAME } from "../config";
import { BANNER_GIF, LOGO } from "../utils/branding";
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
  const avatarUrl = member.user.displayAvatarURL({ size: 512 });

  const container = new ContainerBuilder().setAccentColor(PREMIUM_COLOR);

  // Banner
  container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(BANNER_GIF)
    )
  );

  // Header
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# ${LOGO} Server Boosted!\n**${member.user.displayName}** just boosted **${APP_NAME}**! 💎`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Boost stats with avatar thumbnail
  const statsSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### 💎 Boost Info\n` +
        `-# Total Boosts: **${boostCount}**\n` +
        `-# Server Level: **${member.guild.premiumTier}**\n` +
        `-# Boosted by: **${member.user.displayName}**`
      )
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder().setURL(avatarUrl)
    );
  container.addSectionComponents(statsSection);

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Thank you
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> 💜 Thank you for supporting the community!\n> Your boost helps keep ${APP_NAME} running.\n\n-# ${LOGO} ${BOT_FOOTER}`
    )
  );

  try {
    await channel.send(`${member}`);
    await channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch {}

  await logText(`💎 **${member.user.tag}** boosted the server! (${boostCount} boosts, Level ${member.guild.premiumTier})`);
}
