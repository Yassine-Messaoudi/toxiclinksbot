import { ChatInputCommandInteraction, Interaction, EmbedBuilder, TextChannel } from "discord.js";
import { BOT_COLOR, CHANNELS, BOT_FOOTER, LOGO_URL } from "../config";
import { errorEmbed, successEmbed } from "../utils/embeds";

export const suggestCommand = {
  name: "suggest",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const idea = cmd.options.getString("idea", true);
    const channelId = CHANNELS.SUGGESTIONS;

    if (!channelId) {
      await cmd.reply({ embeds: [errorEmbed("Suggestions channel not configured.")], ephemeral: true });
      return;
    }

    const channel = cmd.guild?.channels.cache.get(channelId) as TextChannel | undefined;
    if (!channel) {
      await cmd.reply({ embeds: [errorEmbed("Suggestions channel not found.")], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setTitle("💡 New Suggestion")
      .setDescription(idea)
      .setAuthor({ name: cmd.user.tag, iconURL: cmd.user.displayAvatarURL() })
      .setFooter({ text: `Vote with the reactions below • ${BOT_FOOTER}`, iconURL: LOGO_URL })
      .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });
    await msg.react("👍");
    await msg.react("👎");

    await cmd.reply({ embeds: [successEmbed(`Your suggestion has been posted in <#${channelId}>!`)], ephemeral: true });
  },
};
