import { ChatInputCommandInteraction, GuildMember, Interaction, TextChannel } from "discord.js";
import { isMod } from "../utils/permissions";
import { errorEmbed, successEmbed, modLogEmbed } from "../utils/embeds";
import { logToChannel } from "../utils/logger";

export const clearCommand = {
  name: "clear",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isMod(member)) {
      await cmd.reply({ embeds: [errorEmbed("You need moderator permissions.")], ephemeral: true });
      return;
    }

    const channel = cmd.channel as TextChannel;
    const amount = cmd.options.getInteger("amount");
    const all = cmd.options.getBoolean("all") ?? false;

    if (!amount && !all) {
      await cmd.reply({ embeds: [errorEmbed("Provide either an `amount` or use `all: True`.")], ephemeral: true });
      return;
    }

    if (all) {
      await cmd.deferReply({ ephemeral: true });

      let totalDeleted = 0;
      let keepDeleting = true;

      while (keepDeleting) {
        try {
          const fetched = await channel.messages.fetch({ limit: 100 });
          if (fetched.size === 0) break;

          const deleted = await channel.bulkDelete(fetched, true);
          totalDeleted += deleted.size;

          // If bulkDelete returned fewer than fetched, remaining messages are >14 days old
          if (deleted.size < fetched.size || deleted.size === 0) {
            keepDeleting = false;
          }
        } catch {
          keepDeleting = false;
        }
      }

      await cmd.editReply({ embeds: [successEmbed(`Cleared **${totalDeleted}** messages from this channel.`)] });

      await logToChannel(modLogEmbed({
        action: "CLEAR ALL",
        moderator: cmd.user,
        target: cmd.user,
        extra: `${totalDeleted} messages in #${channel.name}`,
      }));
      return;
    }

    // Clear specific number
    if (amount! < 1 || amount! > 100) {
      await cmd.reply({ embeds: [errorEmbed("Amount must be between 1 and 100.")], ephemeral: true });
      return;
    }

    try {
      const deleted = await channel.bulkDelete(amount!, true);
      await cmd.reply({
        embeds: [successEmbed(`Cleared **${deleted.size}** messages.`)],
        ephemeral: true,
      });

      await logToChannel(modLogEmbed({
        action: "CLEAR",
        moderator: cmd.user,
        target: cmd.user,
        extra: `${deleted.size} messages in #${channel.name}`,
      }));
    } catch (err) {
      await cmd.reply({ embeds: [errorEmbed(`Failed to clear: ${(err as Error).message}`)], ephemeral: true });
    }
  },
};
