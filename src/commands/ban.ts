import { ChatInputCommandInteraction, GuildMember, Interaction } from "discord.js";
import { isMod, canModerate } from "../utils/permissions";
import { errorEmbed, successEmbed, modLogEmbed } from "../utils/embeds";
import { logToChannel } from "../utils/logger";

export const banCommand = {
  name: "ban",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isMod(member)) {
      await cmd.reply({ embeds: [errorEmbed("You need moderator permissions.")], ephemeral: true });
      return;
    }

    const target = cmd.options.getUser("user", true);
    const reason = cmd.options.getString("reason") || "No reason provided";
    const deleteMessages = cmd.options.getInteger("delete_messages") || 0;
    const targetMember = cmd.guild?.members.cache.get(target.id);

    if (target.id === cmd.user.id) {
      await cmd.reply({ embeds: [errorEmbed("You can't ban yourself.")], ephemeral: true });
      return;
    }

    if (targetMember && !canModerate(member, targetMember)) {
      await cmd.reply({ embeds: [errorEmbed("You can't ban someone with a higher role.")], ephemeral: true });
      return;
    }

    try {
      await target.send({
        embeds: [errorEmbed(`You have been **banned** from **${cmd.guild?.name}**\n\n**Reason:** ${reason}`)],
      });
    } catch {}

    try {
      await cmd.guild?.members.ban(target, {
        reason: `${cmd.user.tag}: ${reason}`,
        deleteMessageSeconds: deleteMessages * 86400,
      });
    } catch (err) {
      await cmd.reply({ embeds: [errorEmbed(`Failed to ban: ${(err as Error).message}`)], ephemeral: true });
      return;
    }

    await cmd.reply({
      embeds: [successEmbed(`**${target.tag}** has been banned.\n**Reason:** ${reason}`)],
    });

    await logToChannel(modLogEmbed({ action: "BAN", moderator: cmd.user, target, reason }));
  },
};
