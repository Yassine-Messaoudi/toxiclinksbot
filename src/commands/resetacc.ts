import { ChatInputCommandInteraction, GuildMember, Interaction, MessageFlags } from "discord.js";
import { isAdmin } from "../utils/permissions";
import { ephemeralErrorV2, successV2, modLogV2 } from "../utils/embeds";
import { logContainerToChannel } from "../utils/logger";
import { prisma } from "../index";

export const resetaccCommand = {
  name: "resetacc",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isAdmin(member)) {
      await cmd.reply(ephemeralErrorV2("You need **Admin** permissions to use this command."));
      return;
    }

    const target = cmd.options.getUser("user", true);
    const reason = cmd.options.getString("reason") || "No reason provided";

    // Find user in DB by discord ID
    const dbUser: any = await (prisma.user as any).findFirst({
      where: { accounts: { some: { providerAccountId: target.id } } },
      select: { id: true, username: true, displayName: true, role: true },
    });

    if (!dbUser) {
      await cmd.reply(ephemeralErrorV2(`**${target.tag}** doesn't have a ToxicLinks account.`));
      return;
    }

    // Reset the user's profile customizations back to defaults
    await prisma.$transaction([
      // Reset user fields
      (prisma.user as any).update({
        where: { id: dbUser.id },
        data: {
          displayName: null,
          bio: null,
          location: null,
          occupation: null,
          gender: null,
          relationship: null,
          bannerUrl: null,
          avatarDecorationUrl: null,
        },
      }),
      // Reset profile to defaults
      (prisma.profile as any).updateMany({
        where: { userId: dbUser.id },
        data: {
          layout: "STANDARD",
          theme: "{}",
          revealScreen: "{}",
          cursorEffect: null,
          cursorUrl: null,
          cursorTrail: null,
          backgroundEffect: null,
          bgAnimation: null,
          backgroundUrl: null,
          backgroundType: "image",
          musicUrl: null,
          musicTitle: null,
          musicDisplayMode: "bar",
          entranceAnimation: null,
          customCss: null,
          seoTitle: null,
          seoDescription: null,
          seoImage: null,
        },
      }),
      // Remove all custom links
      (prisma.link as any).deleteMany({ where: { userId: dbUser.id } }),
      // Remove all social links
      (prisma.socialLink as any).deleteMany({ where: { userId: dbUser.id } }),
      // Remove all widgets
      (prisma.widget as any).deleteMany({ where: { userId: dbUser.id } }),
    ]);

    await cmd.reply({
      components: [successV2(`**${target.tag}**'s account has been reset.\n\n**Username:** ${dbUser.username || "(none)"}\n**Reason:** ${reason}\n\nAll profile customizations, links, socials, and widgets have been cleared.`)],
      flags: MessageFlags.IsComponentsV2,
    });

    await logContainerToChannel(
      modLogV2({
        action: "ACCOUNT RESET",
        moderator: cmd.user,
        target,
        reason,
        extra: `Profile: ${dbUser.username || "(no username)"}`,
      })
    );
  },
};
