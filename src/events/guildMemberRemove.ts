import {
  GuildMember, PartialGuildMember, Client, TextChannel, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, ThumbnailBuilder,
} from "discord.js";
import { CHANNELS, BOT_FOOTER, GOODBYE_COLOR, APP_NAME } from "../config";
import { BANNER_GIF, LOGO } from "../utils/branding";
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
  const avatarUrl = member.user?.displayAvatarURL({ size: 512 }) || BANNER_GIF;
  const displayName = member.user?.displayName || "Unknown";
  const tag = member.user?.tag || "Unknown";

  const container = new ContainerBuilder().setAccentColor(GOODBYE_COLOR);

  container.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(BANNER_GIF)
    )
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# 💀 Goodbye, ${displayName}\n**${tag}** has left the server.`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const statsLines = [
    `-# � Members remaining: **${remaining.toLocaleString()}**`,
  ];
  if (stayDays !== null) statsLines.push(`-# ⏱️ Stayed for: **${stayDays}** days`);

  const statsSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(statsLines.join("\n"))
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder().setURL(avatarUrl)
    );
  container.addSectionComponents(statsSection);

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${LOGO} ${APP_NAME} • ${BOT_FOOTER}`)
  );

  try {
    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch {}

  await logText(`💀 **${tag}** left the server (${remaining} members)`);
}
