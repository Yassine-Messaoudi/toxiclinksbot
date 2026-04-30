import { ChatInputCommandInteraction, GuildMember, Interaction, MessageFlags } from "discord.js";
import { isMod, canModerate } from "../utils/permissions";
import { ephemeralErrorV2, successV2, modLogV2, errorV2 } from "../utils/embeds";
import { logContainerToChannel } from "../utils/logger";

export const kickCommand = {
  name: "kick",
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
    const targetMember = cmd.guild?.members.cache.get(target.id);

    if (!targetMember) {
      await cmd.reply(ephemeralErrorV2("User not found in this server."));
      return;
    }

    if (!canModerate(member, targetMember)) {
      await cmd.reply(ephemeralErrorV2("You can't kick someone with a higher role."));
      return;
    }

    try {
      await target.send({
        components: [errorV2(`You have been **kicked** from **${cmd.guild?.name}**\n\n**Reason:** ${reason}`)],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {}

    try {
      await targetMember.kick(`${cmd.user.tag}: ${reason}`);
    } catch (err) {
      await cmd.reply(ephemeralErrorV2(`Failed to kick: ${(err as Error).message}`));
      return;
    }

    await cmd.reply({
      components: [successV2(`**${target.tag}** has been kicked.\n**Reason:** ${reason}`)],
      flags: MessageFlags.IsComponentsV2,
    });

    await logContainerToChannel(modLogV2({ action: "KICK", moderator: cmd.user, target, reason }));
  },
};
