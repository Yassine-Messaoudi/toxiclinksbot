import { ChatInputCommandInteraction, GuildMember, Interaction } from "discord.js";
import { isMod, canModerate } from "../utils/permissions";
import { errorEmbed, successEmbed, modLogEmbed } from "../utils/embeds";
import { logToChannel } from "../utils/logger";

export const kickCommand = {
  name: "kick",
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

    if (!targetMember) {
      await cmd.reply({ embeds: [errorEmbed("User not found in this server.")], ephemeral: true });
      return;
    }

    if (!canModerate(member, targetMember)) {
      await cmd.reply({ embeds: [errorEmbed("You can't kick someone with a higher role.")], ephemeral: true });
      return;
    }

    try {
      await target.send({
        embeds: [errorEmbed(`You have been **kicked** from **${cmd.guild?.name}**\n\n**Reason:** ${reason}`)],
      });
    } catch {}

    try {
      await targetMember.kick(`${cmd.user.tag}: ${reason}`);
    } catch (err) {
      await cmd.reply({ embeds: [errorEmbed(`Failed to kick: ${(err as Error).message}`)], ephemeral: true });
      return;
    }

    await cmd.reply({ embeds: [successEmbed(`**${target.tag}** has been kicked.\n**Reason:** ${reason}`)] });
    await logToChannel(modLogEmbed({ action: "KICK", moderator: cmd.user, target, reason }));
  },
};
