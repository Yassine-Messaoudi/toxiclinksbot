import {
  ChatInputCommandInteraction, GuildMember, Interaction,
  TextChannel, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
} from "discord.js";
import { isStaff } from "../utils/permissions";
import { ephemeralErrorV2, ephemeralSuccessV2 } from "../utils/embeds";
import { BOT_FOOTER } from "../config";
import { LOGO } from "../utils/branding";

export const embedCommand = {
  name: "embed",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isStaff(member)) {
      await cmd.reply(ephemeralErrorV2("Staff only command."));
      return;
    }

    const title = cmd.options.getString("title", true);
    const description = cmd.options.getString("description", true);
    const colorHex = cmd.options.getString("color") || "#39ff14";
    const imageUrl = cmd.options.getString("image") || null;
    const thumbnailUrl = cmd.options.getString("thumbnail") || null;
    const footerText = cmd.options.getString("footer") || BOT_FOOTER;
    const targetChannel = cmd.options.getChannel("channel") as TextChannel | null;

    const color = parseInt(colorHex.replace("#", ""), 16) || 0x39ff14;

    const container = new ContainerBuilder().setAccentColor(color);

    if (imageUrl) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(imageUrl)
        )
      );
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${title}\n${description}`)
    );

    if (thumbnailUrl) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(thumbnailUrl)
        )
      );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${LOGO} ${footerText}`)
    );

    const channel = targetChannel || (cmd.channel as TextChannel);
    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });

    await cmd.reply(ephemeralSuccessV2(`Embed sent to <#${channel.id}>`));
  },
};
