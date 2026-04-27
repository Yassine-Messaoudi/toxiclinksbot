import { ChatInputCommandInteraction, GuildMember, Interaction, TextChannel, EmbedBuilder } from "discord.js";
import { isStaff } from "../utils/permissions";
import { errorEmbed, successEmbed } from "../utils/embeds";
import { BOT_COLOR, CHANNELS, BOT_FOOTER, LOGO_URL, SKULL_GIF_URL } from "../config";

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

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setTitle(`📢 ${title}`)
      .setDescription(message)
      .setThumbnail(SKULL_GIF_URL)
      .setFooter({ text: `Announced by ${cmd.user.tag} • ${BOT_FOOTER}`, iconURL: LOGO_URL })
      .setTimestamp();

    if (cmd.user.displayAvatarURL()) {
      embed.setAuthor({ name: cmd.user.tag, iconURL: cmd.user.displayAvatarURL() });
    }

    await channel.send({
      content: ping ? "@everyone" : undefined,
      embeds: [embed],
    });

    await cmd.reply({ embeds: [successEmbed(`Announcement posted in <#${channelId}>`)], ephemeral: true });
  },
};
