import { ChatInputCommandInteraction, GuildMember, Interaction, MessageFlags } from "discord.js";
import { isMod, canModerate } from "../utils/permissions";
import { ephemeralErrorV2, successV2, modLogV2, errorV2 } from "../utils/embeds";
import { logContainerToChannel } from "../utils/logger";

export const banCommand = {
  name: "ban",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isMod(member)) {
      await cmd.reply(ephemeralErrorV2("You need moderator permissions."));
      return;
    }

    const target = cmd.options.getUser("user", true);
    const reason = cmd.options.getString("reason") || "No reason provided";
    const deleteMessages = cmd.options.getInteger("delete_messages") || 0;
    const targetMember = cmd.guild?.members.cache.get(target.id);

    if (target.id === cmd.user.id) {
      await cmd.reply(ephemeralErrorV2("You can't ban yourself."));
      return;
    }

    if (targetMember && !canModerate(member, targetMember)) {
      await cmd.reply(ephemeralErrorV2("You can't ban someone with a higher role."));
      return;
    }

    try {
      await target.send({
        components: [errorV2(`You have been **banned** from **${cmd.guild?.name}**\n\n**Reason:** ${reason}`)],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {}

    try {
      await cmd.guild?.members.ban(target, {
        reason: `${cmd.user.tag}: ${reason}`,
        deleteMessageSeconds: deleteMessages * 86400,
      });
    } catch (err) {
      await cmd.reply(ephemeralErrorV2(`Failed to ban: ${(err as Error).message}`));
      return;
    }

    await cmd.reply({
      components: [successV2(`**${target.tag}** has been banned.\n**Reason:** ${reason}`)],
      flags: MessageFlags.IsComponentsV2,
    });

    await logContainerToChannel(modLogV2({ action: "BAN", moderator: cmd.user, target, reason }));
  },
};
