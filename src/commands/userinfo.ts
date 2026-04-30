import {
  ChatInputCommandInteraction, GuildMember, Interaction, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, ThumbnailBuilder,
} from "discord.js";
import { BOT_COLOR, BOT_FOOTER, APP_URL } from "../config";
import { BANNER_GIF, LOGO } from "../utils/branding";
import { prisma } from "../index";

export const userinfoCommand = {
  name: "userinfo",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const target = cmd.options.getUser("user") || cmd.user;
    const member = cmd.guild?.members.cache.get(target.id) as GuildMember | undefined;

    const container = new ContainerBuilder().setAccentColor(BOT_COLOR);

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(BANNER_GIF)
      )
    );

    // Header with avatar
    const headerSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${LOGO} ${target.displayName}\n-# @${target.tag} • \`${target.id}\``
        )
      )
      .setThumbnailAccessory(
        new ThumbnailBuilder().setURL(target.displayAvatarURL({ size: 512 }))
      );
    container.addSectionComponents(headerSection);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Account info
    const lines: string[] = [
      `> 📅 **Created:** <t:${Math.floor(target.createdTimestamp / 1000)}:R>`,
    ];

    if (member) {
      lines.push(`> 📥 **Joined:** ${member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : "Unknown"}`);
      if (member.nickname) lines.push(`> 🏷️ **Nickname:** ${member.nickname}`);
      lines.push(`> 🚀 **Boosting:** ${member.premiumSince ? `Since <t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>` : "No"}`);
      const topRole = member.roles.highest.id !== cmd.guild?.id ? `${member.roles.highest}` : "None";
      lines.push(`> 👑 **Top Role:** ${topRole}`);
      lines.push(`> 🎭 **Roles:** ${member.roles.cache.filter(r => r.id !== cmd.guild?.id).size}`);
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(lines.join("\n"))
    );

    // ToxicLinks account
    const dbUser = await prisma.user.findFirst({
      where: { accounts: { some: { provider: "discord", providerAccountId: target.id } } },
      select: { username: true, plan: true, profile: { select: { totalViews: true } } },
    });

    if (dbUser?.username) {
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ⚡ ToxicLinks Profile\n` +
          `> [@${dbUser.username}](${APP_URL}/${dbUser.username}) • ${dbUser.plan} • ${dbUser.profile?.totalViews || 0} views`
        )
      );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
    );

    await cmd.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};
