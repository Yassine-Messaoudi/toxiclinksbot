import { ChatInputCommandInteraction, GuildMember, Interaction, PermissionFlagsBits } from "discord.js";
import { isMod, canModerate } from "../utils/permissions";
import { errorEmbed, successEmbed, modLogEmbed } from "../utils/embeds";
import { logToChannel } from "../utils/logger";

export const warnCommand = {
  name: "warn",
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
    const targetMember = cmd.guild?.members.cache.get(target.id);

    if (target.id === cmd.user.id) {
      await cmd.reply({ embeds: [errorEmbed("You can't warn yourself.")], ephemeral: true });
      return;
    }

    if (targetMember && !canModerate(member, targetMember)) {
      await cmd.reply({ embeds: [errorEmbed("You can't warn someone with a higher role.")], ephemeral: true });
      return;
    }

    // DM the user
    try {
      await target.send({
        embeds: [errorEmbed(`You have been **warned** in **${cmd.guild?.name}**\n\n**Reason:** ${reason}`)],
      });
    } catch {}

    await cmd.reply({
      embeds: [successEmbed(`**${target.tag}** has been warned.\n**Reason:** ${reason}`)],
    });

    await logToChannel(modLogEmbed({
      action: "WARN",
      moderator: cmd.user,
      target,
      reason,
    }));
  },
};
