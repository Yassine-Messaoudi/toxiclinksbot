import {
  ChatInputCommandInteraction, Interaction, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
} from "discord.js";
import { prisma } from "../index";
import { BOT_COLOR, BOT_FOOTER } from "../config";
import { ephemeralErrorV2 } from "../utils/embeds";
import { BANNER_GIF, EMOJI_NAMES, guildEmoji, logoEmoji } from "../utils/branding";

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

    const guild = cmd.guild;
    const logo = logoEmoji(guild);
    const eWebsite = guildEmoji(guild, EMOJI_NAMES.website);
    const eLogoNoBg = guildEmoji(guild, EMOJI_NAMES.logoNoBg);

    const container = new ContainerBuilder().setAccentColor(BOT_COLOR);

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(BANNER_GIF)
      )
    );

    let body =
      `# ${logo} Analytics — @${dbUser.username}\n\n` +
      `> ${eWebsite} **Total Views:** ${totalViews.toLocaleString()}\n` +
      `> ${eLogoNoBg} **Total Clicks:** ${totalClicks.toLocaleString()}\n` +
      `> ${eWebsite} **Links:** ${dbUser.links.length}`;

    if (dbUser.links.length > 0) {
      const topLinks = dbUser.links
        .map((l, i) => `> **${i + 1}.** ${l.title} — ${l.clicks} clicks`)
        .join("\n");
      body += `\n\n### ${eLogoNoBg} Top Links\n${topLinks}`;
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${logo} ${BOT_FOOTER}`)
    );

    await cmd.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
  },
};
