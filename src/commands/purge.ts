import { ChatInputCommandInteraction, GuildMember, Interaction, TextChannel } from "discord.js";
import { isMod } from "../utils/permissions";
import { ephemeralErrorV2, ephemeralSuccessV2, modLogV2 } from "../utils/embeds";
import { logContainerToChannel } from "../utils/logger";

export const purgeCommand = {
  name: "purge",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isMod(member)) {
      await cmd.reply(ephemeralErrorV2("You need moderator permissions."));
      return;
    }

    const amount = cmd.options.getInteger("amount", true);
    if (amount < 1 || amount > 100) {
      await cmd.reply(ephemeralErrorV2("Amount must be between 1 and 100."));
      return;
    }

    const channel = cmd.channel as TextChannel;
    try {
      const deleted = await channel.bulkDelete(amount, true);
      await cmd.reply(ephemeralSuccessV2(`Deleted **${deleted.size}** messages.`));

      await logContainerToChannel(modLogV2({
        action: "PURGE",
        moderator: cmd.user,
        target: cmd.user,
        extra: `${deleted.size} messages in #${channel.name}`,
      }));
    } catch (err) {
      await cmd.reply(ephemeralErrorV2(`Failed to purge: ${(err as Error).message}`));
    }
  },
};
