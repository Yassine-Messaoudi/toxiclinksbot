import {
  ChatInputCommandInteraction, GuildMember, Interaction, TextChannel,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags,
} from "discord.js";
import { isStaff } from "../utils/permissions";
import { errorEmbed, successEmbed } from "../utils/embeds";
import { BOT_COLOR, CHANNELS, BOT_FOOTER, APP_NAME } from "../config";
import { BANNER_GIF, LOGO } from "../utils/branding";

export const announceCommand = {
  name: "announce",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isStaff(member)) {
      await cmd.reply({ embeds: [errorEmbed("Staff only command.")], ephemeral: true });
      return;
    }

    const title = cmd.options.getString("title", true);
    const message = cmd.options.getString("message", true);
    const ping = cmd.options.getBoolean("ping") ?? false;
    const channelId = CHANNELS.ANNOUNCEMENTS;

    if (!channelId) {
      await cmd.reply({ embeds: [errorEmbed("Announcements channel not configured.")], ephemeral: true });
      return;
    }

    const channel = cmd.guild?.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      await cmd.reply({ embeds: [errorEmbed("Announcements channel not found.")], ephemeral: true });
      return;
    }

    const container = new ContainerBuilder().setAccentColor(BOT_COLOR);

    // Banner
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(BANNER_GIF)
      )
    );

    // Title + body
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${LOGO} ${title}\n${message}`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Footer with author
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ⚡ Announced by **${cmd.user.displayName}** • ${BOT_FOOTER}`
      )
    );

    // Ping first if needed (content can't mix with Components V2)
    if (ping) {
      await channel.send("@everyone");
    }

    await channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await cmd.reply({ embeds: [successEmbed(`Announcement posted in <#${channelId}>`)], ephemeral: true });
  },
};
