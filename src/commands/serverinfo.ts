import {
  ChatInputCommandInteraction, Interaction, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, ThumbnailBuilder,
} from "discord.js";
import { BOT_COLOR, BOT_FOOTER } from "../config";
import { BANNER_GIF, LOGO } from "../utils/branding";

export const serverinfoCommand = {
  name: "serverinfo",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const guild = cmd.guild;
    if (!guild) { await cmd.reply({ content: "This command can only be used in a server.", ephemeral: true }); return; }

    await guild.members.fetch().catch(() => {});

    const online = guild.members.cache.filter(m => m.presence?.status === "online" || m.presence?.status === "idle" || m.presence?.status === "dnd").size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = guild.memberCount - bots;
    const boosts = guild.premiumSubscriptionCount || 0;
    const channels = guild.channels.cache;
    const textChannels = channels.filter(c => c.isTextBased() && !c.isVoiceBased()).size;
    const voiceChannels = channels.filter(c => c.isVoiceBased()).size;
    const roles = guild.roles.cache.size - 1;

    const container = new ContainerBuilder().setAccentColor(BOT_COLOR);

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(BANNER_GIF)
      )
    );

    const iconUrl = guild.iconURL({ size: 512 });
    if (iconUrl) {
      const headerSection = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`# ${LOGO} ${guild.name}`)
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(iconUrl));
      container.addSectionComponents(headerSection);
    } else {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${LOGO} ${guild.name}`)
      );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> 👥 **Members:** **${guild.memberCount.toLocaleString()}** total — ${humans.toLocaleString()} humans • ${bots} bots • ${online.toLocaleString()} online\n` +
        `> 💬 **Channels:** ${textChannels} text • ${voiceChannels} voice — ${channels.size} total\n` +
        `> 🎭 **Roles:** ${roles}\n` +
        `> 🚀 **Boosts:** **${boosts}** (Level ${guild.premiumTier})\n` +
        `> 👑 **Owner:** <@${guild.ownerId}>\n` +
        `> 📅 **Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:R>`
      )
    );

    if (guild.bannerURL()) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(guild.bannerURL({ size: 1024 })!)
        )
      );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${LOGO} ID: ${guild.id} • ${BOT_FOOTER}`)
    );

    await cmd.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};
