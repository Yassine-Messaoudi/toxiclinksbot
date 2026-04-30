import { ChatInputCommandInteraction, GuildMember, Interaction, TextChannel } from "discord.js";
import { isMod } from "../utils/permissions";
import { ephemeralErrorV2, ephemeralSuccessV2, modLogV2 } from "../utils/embeds";
import { logContainerToChannel } from "../utils/logger";

export const clearCommand = {
  name: "clear",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isMod(member)) {
      await cmd.reply(ephemeralErrorV2("You need moderator permissions."));
      return;
    }

    const channel = cmd.channel as TextChannel;
    const amount = cmd.options.getInteger("amount");
    const all = cmd.options.getBoolean("all") ?? false;

    if (!amount && !all) {
      await cmd.reply(ephemeralErrorV2("Provide either an `amount` or use `all: True`."));
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

          if (deleted.size < fetched.size || deleted.size === 0) {
            keepDeleting = false;
          }
        } catch {
          keepDeleting = false;
        }
      }

      await cmd.editReply(ephemeralSuccessV2(`Cleared **${totalDeleted}** messages from this channel.`));

      await logContainerToChannel(modLogV2({
        action: "CLEAR ALL",
        moderator: cmd.user,
        target: cmd.user,
        extra: `${totalDeleted} messages in #${channel.name}`,
      }));
      return;
    }

    if (amount! < 1 || amount! > 100) {
      await cmd.reply(ephemeralErrorV2("Amount must be between 1 and 100."));
      return;
    }

    try {
      const deleted = await channel.bulkDelete(amount!, true);
      await cmd.reply(ephemeralSuccessV2(`Cleared **${deleted.size}** messages.`));

      await logContainerToChannel(modLogV2({
        action: "CLEAR",
        moderator: cmd.user,
        target: cmd.user,
        extra: `${deleted.size} messages in #${channel.name}`,
      }));
    } catch (err) {
      await cmd.reply(ephemeralErrorV2(`Failed to clear: ${(err as Error).message}`));
    }
  },
};
