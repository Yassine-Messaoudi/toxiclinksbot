import { ChatInputCommandInteraction, GuildMember, Interaction, MessageFlags } from "discord.js";
import { isMod, canModerate } from "../utils/permissions";
import { ephemeralErrorV2, successV2, modLogV2, errorV2 } from "../utils/embeds";
import { logContainerToChannel } from "../utils/logger";

export const warnCommand = {
  name: "warn",
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

    if (target.id === cmd.user.id) {
      await cmd.reply(ephemeralErrorV2("You can't warn yourself."));
      return;
    }

    if (targetMember && !canModerate(member, targetMember)) {
      await cmd.reply(ephemeralErrorV2("You can't warn someone with a higher role."));
      return;
    }

    try {
      await target.send({
        components: [errorV2(`You have been **warned** in **${cmd.guild?.name}**\n\n**Reason:** ${reason}`)],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {}

    await cmd.reply({
      components: [successV2(`**${target.tag}** has been warned.\n**Reason:** ${reason}`)],
      flags: MessageFlags.IsComponentsV2,
    });

    await logContainerToChannel(modLogV2({
      action: "WARN",
      moderator: cmd.user,
      target,
      reason,
    }));
  },
};
