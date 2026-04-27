import { ChatInputCommandInteraction, EmbedBuilder, Interaction } from "discord.js";
import { prisma } from "../index";
import { BOT_COLOR, BOT_FOOTER, LOGO_URL } from "../config";

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
      await cmd.reply({
        content: "You don't have a ToxicLinks account yet.",
        ephemeral: true,
      });
      return;
    }

    const totalViews = dbUser.profile?.totalViews || 0;
    const totalClicks = dbUser.links.reduce((sum, l) => sum + l.clicks, 0);

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setTitle(`📊 Analytics for @${dbUser.username}`)
      .addFields(
        { name: "Total Views", value: totalViews.toLocaleString(), inline: true },
        { name: "Total Link Clicks", value: totalClicks.toLocaleString(), inline: true },
        { name: "Links", value: `${dbUser.links.length}`, inline: true },
      );

    if (dbUser.links.length > 0) {
      const topLinks = dbUser.links
        .map((l, i) => `**${i + 1}.** ${l.title} — ${l.clicks} clicks`)
        .join("\n");
      embed.addFields({ name: "Top Links", value: topLinks });
    }

    embed.setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL });
    embed.setTimestamp();

    await cmd.reply({ embeds: [embed], ephemeral: true });
  },
};
