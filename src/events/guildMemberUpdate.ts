import {
  GuildMember, PartialGuildMember, Client, TextChannel, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, ThumbnailBuilder,
} from "discord.js";
import { PrismaClient } from "@prisma/client";
import { CHANNELS, PREMIUM_COLOR, BOT_FOOTER, APP_NAME } from "../config";
import { BANNER_GIF, LOGO } from "../utils/branding";
import { logText } from "../utils/logger";

export async function handleGuildMemberUpdate(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
  client: Client,
  prisma: PrismaClient
) {
  // Detect boost change
  const wasBoosting = oldMember.premiumSince !== null && oldMember.premiumSince !== undefined;
  const isBoosting = newMember.premiumSince !== null && newMember.premiumSince !== undefined;

  if (!wasBoosting && isBoosting) {
    await handleNewBoost(newMember, client);
    await grantBoosterBadge(newMember.user.id, prisma);
  } else if (wasBoosting && !isBoosting) {
    await revokeBoosterBadge(newMember.user.id, prisma);
    await logText(`💔 **${newMember.user.tag}** stopped boosting the server.`);
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

/* ── Booster badge helpers ── */

async function grantBoosterBadge(discordId: string, prisma: PrismaClient) {
  try {
    const connection = await prisma.discordConnection.findUnique({
      where: { discordId },
      select: { userId: true },
    });
    if (!connection) return;

    // Upsert: create only if it doesn't already exist (unique: userId + type + label)
    await prisma.badge.upsert({
      where: {
        userId_type_label: {
          userId: connection.userId,
          type: "BOOSTER",
          label: "Server Booster",
        },
      },
      create: {
        userId: connection.userId,
        type: "BOOSTER",
        label: "Server Booster",
        color: "#f47fff",
      },
      update: {}, // already exists, no-op
    });
    console.log(`[Bot] Granted BOOSTER badge to user ${connection.userId} (discord: ${discordId})`);
  } catch (err) {
    console.error("[Bot] Failed to grant booster badge:", (err as Error).message);
  }
}

async function revokeBoosterBadge(discordId: string, prisma: PrismaClient) {
  try {
    const connection = await prisma.discordConnection.findUnique({
      where: { discordId },
      select: { userId: true },
    });
    if (!connection) return;

    await prisma.badge.deleteMany({
      where: {
        userId: connection.userId,
        type: "BOOSTER",
      },
    });
    console.log(`[Bot] Revoked BOOSTER badge from user ${connection.userId} (discord: ${discordId})`);
  } catch (err) {
    console.error("[Bot] Failed to revoke booster badge:", (err as Error).message);
  }
}

/**
 * Scan all guild members and sync BOOSTER badges.
 * Call this on bot startup to catch any boosts that happened while offline.
 */
export async function syncAllBoosterBadges(guild: import("discord.js").Guild, prisma: PrismaClient) {
  try {
    const members = await guild.members.fetch();
    let granted = 0;
    let revoked = 0;

    // Get all discord connections in one query for efficiency
    const connections = await prisma.discordConnection.findMany({
      select: { discordId: true, userId: true },
    });
    const discordToUser = new Map(connections.map((c) => [c.discordId, c.userId]));

    for (const [, member] of members) {
      const userId = discordToUser.get(member.user.id);
      if (!userId) continue;

      const isBoosting = member.premiumSince !== null && member.premiumSince !== undefined;

      if (isBoosting) {
        // Grant badge if not already present
        const existing = await prisma.badge.findUnique({
          where: { userId_type_label: { userId, type: "BOOSTER", label: "Server Booster" } },
        });
        if (!existing) {
          await prisma.badge.create({
            data: { userId, type: "BOOSTER", label: "Server Booster", color: "#f47fff" },
          });
          granted++;
        }
      } else {
        // Revoke badge if present
        const deleted = await prisma.badge.deleteMany({
          where: { userId, type: "BOOSTER" },
        });
        if (deleted.count > 0) revoked++;
      }
    }

    console.log(`[Bot] Booster badge sync complete: ${granted} granted, ${revoked} revoked`);
  } catch (err) {
    console.error("[Bot] Failed to sync booster badges:", (err as Error).message);
  }
}
