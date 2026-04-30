import {
  ChatInputCommandInteraction, Interaction, TextChannel, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  ThumbnailBuilder,
} from "discord.js";
import { BOT_COLOR, CHANNELS, BOT_FOOTER } from "../config";
import { ephemeralErrorV2, ephemeralSuccessV2 } from "../utils/embeds";
import { LOGO } from "../utils/branding";

export const suggestCommand = {
  name: "suggest",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const idea = cmd.options.getString("idea", true);
    const channelId = CHANNELS.SUGGESTIONS;

    if (!channelId) {
      await cmd.reply(ephemeralErrorV2("Suggestions channel not configured."));
      return;
    }

    const channel = cmd.guild?.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      await cmd.reply(ephemeralErrorV2("Suggestions channel not found."));
      return;
    }

    const container = new ContainerBuilder().setAccentColor(BOT_COLOR);

    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# 💡 Suggestion\n${idea}\n\n-# by **${cmd.user.displayName}** • Vote with reactions below`
        )
      )
      .setThumbnailAccessory(
        new ThumbnailBuilder().setURL(cmd.user.displayAvatarURL({ size: 256 }))
      );
    container.addSectionComponents(section);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
    );

    const msg = await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await msg.react("👍");
    await msg.react("👎");

    await cmd.reply(ephemeralSuccessV2(`Your suggestion has been posted in <#${channelId}>!`));
  },
};
