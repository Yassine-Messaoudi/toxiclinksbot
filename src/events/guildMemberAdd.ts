import {
  GuildMember, Client, TextChannel, ButtonBuilder, ButtonStyle, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, ThumbnailBuilder,
} from "discord.js";
import { PrismaClient } from "@prisma/client";
import { CHANNELS, ROLES, BOT_COLOR, APP_URL, BOT_FOOTER, APP_NAME } from "../config";
import { BANNER_GIF, LOGO, EMOJI } from "../utils/branding";
import { logText } from "../utils/logger";

const prisma = new PrismaClient();

export async function handleGuildMemberAdd(member: GuildMember, client: Client) {
  // Auto-grant DISCORD_MEMBER badge if they have a ToxicLinks account
  try {
    const connection = await prisma.discordConnection.findUnique({
      where: { discordId: member.id },
      select: { userId: true },
    });
    if (connection) {
      await prisma.badge.upsert({
        where: { userId_type_label: { userId: connection.userId, type: "DISCORD_MEMBER", label: "Discord Member" } },
        create: { userId: connection.userId, type: "DISCORD_MEMBER", label: "Discord Member", icon: "discord", color: "#5865F2" },
        update: {},
      });
      console.log(`[Bot] Granted DISCORD_MEMBER badge to user ${connection.userId}`);
    }
  } catch (err) {
    console.warn("[Bot] Failed to grant DISCORD_MEMBER badge:", (err as Error).message);
  }
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
  const avatarUrl = member.user.displayAvatarURL({ size: 512 });
  const logoEmoji = LOGO;

  // ── Components V2: Welcome Container ──
  const container = new ContainerBuilder()
    .setAccentColor(BOT_COLOR);

  // Banner GIF (same as ticket panel)
  container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(BANNER_GIF)
    )
  );

  // Header with logo emoji + welcome title
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# ${logoEmoji} Welcome to ${APP_NAME}\n` +
      `**${member.user.displayName}** just joined the **toxic** side.`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Member stats section with avatar thumbnail
  const statsSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ⚡ Member #${memberCount.toLocaleString()}${ordinal}\n` +
        `-# Account Age: **${createdDays.toLocaleString()}** days\n` +
        `-# Server Members: **${memberCount.toLocaleString()}**`
      )
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder().setURL(avatarUrl)
    );
  container.addSectionComponents(statsSection);

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Quick links section — Rules
  const rulesSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### 📜 Read the Rules\n` +
        `-# Get familiar with our community guidelines.`
      )
    )
    .setButtonAccessory(
      new ButtonBuilder()
        .setCustomId("welcome_rules")
        .setLabel("Rules")
        .setEmoji("📜")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
  container.addSectionComponents(rulesSection);

  // Quick links section — Chat
  const chatSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### 💬 Start Chatting\n` +
        `-# Jump into the conversation with the community.`
      )
    )
    .setButtonAccessory(
      new ButtonBuilder()
        .setCustomId("welcome_chat")
        .setLabel("Chat")
        .setEmoji("💬")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
  container.addSectionComponents(chatSection);

  // Quick links section — Create Profile (link button)
  const profileSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ⚡ Create Your Profile\n` +
        `-# Build your toxic bio link page.`
      )
    )
    .setButtonAccessory(
      new ButtonBuilder()
        .setURL(`${APP_URL}/auth/signin`)
        .setLabel("Create Profile")
        .setEmoji("☠️")
        .setStyle(ButtonStyle.Link)
    );
  container.addSectionComponents(profileSection);

  // Quick links section — Need Help?
  const supportSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### 🎫 Need Help?\n` +
        `-# Open a ticket and our team will assist you.`
      )
    )
    .setButtonAccessory(
      new ButtonBuilder()
        .setCustomId("welcome_support")
        .setLabel("Support")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
  container.addSectionComponents(supportSection);

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Footer
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# ${logoEmoji} ${APP_NAME} • ${BOT_FOOTER}`
    )
  );

  // Ping the member first (content can't be used with Components V2)
  try {
    await channel.send(`${member}`);
    await channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch {}

  await logText(`☠️ **${member.user.tag}** joined the server (${memberCount} members)`);
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
