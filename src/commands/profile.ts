import {
  ChatInputCommandInteraction, Interaction, MessageFlags,
  ButtonBuilder, ButtonStyle,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, ThumbnailBuilder,
} from "discord.js";
import { prisma } from "../index";
import { BOT_COLOR, APP_URL, BOT_FOOTER } from "../config";
import { ephemeralErrorV2 } from "../utils/embeds";
import { BANNER_GIF, LOGO } from "../utils/branding";

export const profileCommand = {
  name: "profile",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const targetUser = cmd.options.getUser("user") || cmd.user;

    const dbUser = await prisma.user.findFirst({
      where: {
        accounts: {
          some: {
            provider: "discord",
            providerAccountId: targetUser.id,
          },
        },
      },
      include: {
        profile: true,
        badges: true,
        links: { where: { isActive: true }, orderBy: { order: "asc" }, take: 5 },
        socialLinks: { orderBy: { order: "asc" } },
      },
    });

    if (!dbUser || !dbUser.username) {
      await cmd.reply(ephemeralErrorV2(
        `${targetUser.id === cmd.user.id ? "You don't" : "This user doesn't"} have a ToxicLinks account yet.\n\nCreate one at **[toxiclinks.gg](${APP_URL})**`
      ));
      return;
    }

    const profileUrl = `${APP_URL}/${dbUser.username}`;
    const views = dbUser.profile?.totalViews || 0;
    const linkCount = dbUser.links.length;
    const socialCount = dbUser.socialLinks.length;
    const planEmoji = dbUser.plan === "PREMIUM" ? "👑" : dbUser.plan === "VERIFIED" ? "✅" : "🔗";
    const badgeText = dbUser.badges.map((b) => `\`${b.type}\``).join(" ") || "None";
    const avatarUrl = dbUser.avatarUrl || dbUser.image || targetUser.displayAvatarURL({ size: 512 });

    const container = new ContainerBuilder().setAccentColor(BOT_COLOR);

    // Banner
    if (dbUser.bannerUrl) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(dbUser.bannerUrl)
        )
      );
    } else {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(BANNER_GIF)
        )
      );
    }

    // Header with avatar
    const headerSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${LOGO} ${dbUser.displayName || dbUser.username}\n` +
          `-# @${dbUser.username} • ${planEmoji} ${dbUser.plan}`
        )
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl));
    container.addSectionComponents(headerSection);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Bio + stats
    const bio = dbUser.bio || "*No bio set*";
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${bio}\n\n` +
        `> 👁️ **Views:** ${views.toLocaleString()} • 🔗 **Links:** ${linkCount} • 📱 **Socials:** ${socialCount}\n` +
        `> 🏅 **Badges:** ${badgeText}`
      )
    );

    // Top links
    if (dbUser.links.length > 0) {
      const linkText = dbUser.links.map((l, i) => `> **${i + 1}.** [${l.title}](${l.url})`).join("\n");
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 📎 Top Links\n${linkText}`)
      );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Profile link button
    const profileSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ⚡ View the full profile on ToxicLinks`)
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setLabel("View Profile")
          .setURL(profileUrl)
          .setStyle(ButtonStyle.Link)
      );
    container.addSectionComponents(profileSection);

    // Footer
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
    );

    await cmd.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};
