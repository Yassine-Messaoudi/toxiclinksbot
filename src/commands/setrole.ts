import { ChatInputCommandInteraction, GuildMember, Interaction, MessageFlags } from "discord.js";
import { isAdmin } from "../utils/permissions";
import { ephemeralErrorV2, successV2, modLogV2 } from "../utils/embeds";
import { logContainerToChannel } from "../utils/logger";
import { prisma } from "../index";

export const setroleCommand = {
  name: "setrole",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isAdmin(member)) {
      await cmd.reply(ephemeralErrorV2("You need **Admin** permissions to use this command."));
      return;
    }

    const target = cmd.options.getUser("user", true);
    const newRole = cmd.options.getString("role", true) as "USER" | "MOD" | "ADMIN";

    // Find user in DB by discord ID
    const dbUser: any = await (prisma.user as any).findFirst({
      where: { accounts: { some: { providerAccountId: target.id } } },
      select: { id: true, username: true, role: true },
    });

    if (!dbUser) {
      await cmd.reply(ephemeralErrorV2(`**${target.tag}** doesn't have a ToxicLinks account.`));
      return;
    }

    if (dbUser.role === newRole) {
      await cmd.reply(ephemeralErrorV2(`**${target.tag}** is already **${newRole}**.`));
      return;
    }

    const oldRole = dbUser.role;

    await (prisma.user as any).update({
      where: { id: dbUser.id },
      data: { role: newRole },
    });

    await cmd.reply({
      components: [successV2(`**${target.tag}**'s role changed\n\n\`${oldRole}\` → \`${newRole}\`\n\nProfile: **${dbUser.username || "(no username)"}**`)],
      flags: MessageFlags.IsComponentsV2,
    });

    await logContainerToChannel(
      modLogV2({
        action: "ROLE CHANGE",
        moderator: cmd.user,
        target,
        reason: `${oldRole} → ${newRole}`,
        extra: `Profile: ${dbUser.username || "(no username)"}`,
      })
    );
  },
};
