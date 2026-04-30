import { ChatInputCommandInteraction, GuildMember, Interaction, MessageFlags } from "discord.js";
import { isMod, canModerate } from "../utils/permissions";
import { ephemeralErrorV2, successV2, modLogV2, errorV2 } from "../utils/embeds";
import { logContainerToChannel } from "../utils/logger";

const DURATIONS: Record<string, number> = {
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  "12h": 12 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
  "28d": 28 * 24 * 60 * 60_000,
};

export const muteCommand = {
  name: "mute",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isMod(member)) {
      await cmd.reply(ephemeralErrorV2("You need moderator permissions."));
      return;
    }

    const target = cmd.options.getUser("user", true);
    const durationStr = cmd.options.getString("duration", true);
    const reason = cmd.options.getString("reason") || "No reason provided";
    const targetMember = cmd.guild?.members.cache.get(target.id);

    if (!targetMember) {
      await cmd.reply(ephemeralErrorV2("User not found in this server."));
      return;
    }

    if (!canModerate(member, targetMember)) {
      await cmd.reply(ephemeralErrorV2("You can't mute someone with a higher role."));
      return;
    }

    const ms = DURATIONS[durationStr];
    if (!ms) {
      await cmd.reply(ephemeralErrorV2("Invalid duration."));
      return;
    }

    try {
      await targetMember.timeout(ms, `${cmd.user.tag}: ${reason}`);
    } catch (err) {
      await cmd.reply(ephemeralErrorV2(`Failed to mute: ${(err as Error).message}`));
      return;
    }

    try {
      await target.send({
        components: [errorV2(`You have been **muted** in **${cmd.guild?.name}** for **${durationStr}**\n\n**Reason:** ${reason}`)],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch {}

    await cmd.reply({
      components: [successV2(`**${target.tag}** has been muted for **${durationStr}**.\n**Reason:** ${reason}`)],
      flags: MessageFlags.IsComponentsV2,
    });

    await logContainerToChannel(modLogV2({
      action: "MUTE",
      moderator: cmd.user,
      target,
      reason,
      duration: durationStr,
    }));
  },
};
