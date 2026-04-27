import {
  ChatInputCommandInteraction, GuildMember, Interaction,
  EmbedBuilder, TextChannel,
} from "discord.js";
import { isStaff } from "../utils/permissions";
import { errorEmbed, successEmbed } from "../utils/embeds";
import { BOT_FOOTER } from "../config";

export const embedCommand = {
  name: "embed",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isStaff(member)) {
      await cmd.reply({ embeds: [errorEmbed("Staff only command.")], ephemeral: true });
      return;
    }

    const title = cmd.options.getString("title", true);
    const description = cmd.options.getString("description", true);
    const colorHex = cmd.options.getString("color") || "#39ff14";
    const imageUrl = cmd.options.getString("image") || null;
    const thumbnailUrl = cmd.options.getString("thumbnail") || null;
    const footerText = cmd.options.getString("footer") || BOT_FOOTER;
    const targetChannel = cmd.options.getChannel("channel") as TextChannel | null;

    // Parse color
    const color = parseInt(colorHex.replace("#", ""), 16) || 0x39ff14;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: footerText })
      .setTimestamp();

    if (imageUrl) embed.setImage(imageUrl);
    if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);

    const channel = targetChannel || (cmd.channel as TextChannel);
    await channel.send({ embeds: [embed] });

    await cmd.reply({
      embeds: [successEmbed(`Embed sent to <#${channel.id}>`)],
      ephemeral: true,
    });
  },
};
