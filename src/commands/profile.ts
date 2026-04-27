import { ChatInputCommandInteraction, EmbedBuilder, Interaction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { prisma } from "../index";
import { BOT_COLOR, APP_URL, BOT_FOOTER, LOGO_URL } from "../config";
import { errorEmbed } from "../utils/embeds";

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
      await cmd.reply({
        embeds: [errorEmbed(`${targetUser.id === cmd.user.id ? "You don't" : "This user doesn't"} have a ToxicLinks account yet.\n\nCreate one at **[toxiclinks.gg](${APP_URL})**`)],
        ephemeral: true,
      });
      return;
    }

    const profileUrl = `${APP_URL}/${dbUser.username}`;
    const views = dbUser.profile?.totalViews || 0;
    const linkCount = dbUser.links.length;
    const socialCount = dbUser.socialLinks.length;
    const planEmoji = dbUser.plan === "PREMIUM" ? "👑" : dbUser.plan === "VERIFIED" ? "✅" : "🔗";
    const badgeText = dbUser.badges.map((b) => `\`${b.type}\``).join(" ") || "None";

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setAuthor({ name: `${dbUser.displayName || dbUser.username}'s Profile`, iconURL: targetUser.displayAvatarURL() })
      .setURL(profileUrl)
      .setDescription(dbUser.bio || "*No bio set*")
      .setThumbnail(dbUser.avatarUrl || dbUser.image || targetUser.displayAvatarURL())
      .addFields(
        { name: "👤 Username", value: `[@${dbUser.username}](${profileUrl})`, inline: true },
        { name: `${planEmoji} Plan`, value: dbUser.plan, inline: true },
        { name: "👁️ Views", value: views.toLocaleString(), inline: true },
        { name: "🏅 Badges", value: badgeText, inline: true },
        { name: "🔗 Links", value: `${linkCount}`, inline: true },
        { name: "📱 Socials", value: `${socialCount}`, inline: true },
      );

    if (dbUser.links.length > 0) {
      const linkText = dbUser.links
        .map((l, i) => `**${i + 1}.** [${l.title}](${l.url})`)
        .join("\n");
      embed.addFields({ name: "📎 Top Links", value: linkText });
    }

    if (dbUser.bannerUrl) {
      embed.setImage(dbUser.bannerUrl);
    }

    embed.setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL });
    embed.setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("View Profile")
        .setURL(profileUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji("🔗"),
      new ButtonBuilder()
        .setLabel("Dashboard")
        .setURL(`${APP_URL}/dashboard`)
        .setStyle(ButtonStyle.Link)
        .setEmoji("⚙️"),
    );

    await cmd.reply({ embeds: [embed], components: [row] });
  },
};
