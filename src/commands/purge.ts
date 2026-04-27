import { ChatInputCommandInteraction, GuildMember, Interaction, TextChannel } from "discord.js";
import { isMod } from "../utils/permissions";
import { errorEmbed, successEmbed, modLogEmbed } from "../utils/embeds";
import { logToChannel } from "../utils/logger";

export const purgeCommand = {
  name: "purge",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isMod(member)) {
      await cmd.reply({ embeds: [errorEmbed("You need moderator permissions.")], ephemeral: true });
      return;
    }

    const amount = cmd.options.getInteger("amount", true);
    if (amount < 1 || amount > 100) {
      await cmd.reply({ embeds: [errorEmbed("Amount must be between 1 and 100.")], ephemeral: true });
      return;
    }

    const channel = cmd.channel as TextChannel;
    try {
      const deleted = await channel.bulkDelete(amount, true);
      await cmd.reply({
        embeds: [successEmbed(`Deleted **${deleted.size}** messages.`)],
        ephemeral: true,
      });

      await logToChannel(modLogEmbed({
        action: "PURGE",
        moderator: cmd.user,
        target: cmd.user,
        extra: `${deleted.size} messages in #${channel.name}`,
      }));
    } catch (err) {
      await cmd.reply({ embeds: [errorEmbed(`Failed to purge: ${(err as Error).message}`)], ephemeral: true });
    }
  },
};
