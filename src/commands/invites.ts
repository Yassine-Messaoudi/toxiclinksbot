import { ChatInputCommandInteraction, GuildMember, Interaction, MessageFlags } from "discord.js";
import { successV2, ephemeralErrorV2 } from "../utils/embeds";

export const invitesCommand = {
  name: "invites",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    if (!cmd.guild) {
      await cmd.reply(ephemeralErrorV2("This command can only be used in a server."));
      return;
    }

    const target = cmd.options.getUser("user") || cmd.user;
    const member = cmd.guild.members.cache.get(target.id);

    try {
      const invites = await cmd.guild.invites.fetch();
      const userInvites = invites.filter((inv) => inv.inviterId === target.id);

      const totalUses = userInvites.reduce((sum, inv) => sum + (inv.uses || 0), 0);
      const activeInvites = userInvites.size;

      // Top 5 invite codes
      const topInvites = [...userInvites.values()]
        .sort((a, b) => (b.uses || 0) - (a.uses || 0))
        .slice(0, 5);

      const lines = [
        `**${target.tag}**'s Invite Stats\n`,
        `> 👥 **Total Invites:** ${totalUses}`,
        `> 🔗 **Active Links:** ${activeInvites}`,
      ];

      if (topInvites.length > 0) {
        lines.push(`\n**Top Invite Codes:**`);
        topInvites.forEach((inv) => {
          lines.push(`> \`${inv.code}\` — **${inv.uses || 0}** uses`);
        });
      }

      await cmd.reply({
        components: [successV2(lines.join("\n"))],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (err) {
      await cmd.reply(ephemeralErrorV2(`Failed to fetch invites: ${(err as Error).message}`));
    }
  },
};
