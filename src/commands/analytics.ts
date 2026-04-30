import {
  ChatInputCommandInteraction, Interaction, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
} from "discord.js";
import { prisma } from "../index";
import { BOT_COLOR, BOT_FOOTER } from "../config";
import { ephemeralErrorV2 } from "../utils/embeds";
import { BANNER_GIF, LOGO } from "../utils/branding";

export const analyticsCommand = {
  name: "analytics",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const dbUser = await prisma.user.findFirst({
      where: {
        accounts: {
          some: {
            provider: "discord",
            providerAccountId: cmd.user.id,
          },
        },
      },
      include: {
        profile: true,
        links: { where: { isActive: true }, orderBy: { clicks: "desc" }, take: 5 },
      },
    });

    if (!dbUser || !dbUser.username) {
      await cmd.reply(ephemeralErrorV2("You don't have a ToxicLinks account yet."));
      return;
    }

    const totalViews = dbUser.profile?.totalViews || 0;
    const totalClicks = dbUser.links.reduce((sum, l) => sum + l.clicks, 0);

    const container = new ContainerBuilder().setAccentColor(BOT_COLOR);

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(BANNER_GIF)
      )
    );

    let body =
      `# ${LOGO} Analytics — @${dbUser.username}\n\n` +
      `> 👁️ **Total Views:** ${totalViews.toLocaleString()}\n` +
      `> 🖱️ **Total Clicks:** ${totalClicks.toLocaleString()}\n` +
      `> 🔗 **Links:** ${dbUser.links.length}`;

    if (dbUser.links.length > 0) {
      const topLinks = dbUser.links
        .map((l, i) => `> **${i + 1}.** ${l.title} — ${l.clicks} clicks`)
        .join("\n");
      body += `\n\n### 📎 Top Links\n${topLinks}`;
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
    );

    await cmd.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
  },
};
