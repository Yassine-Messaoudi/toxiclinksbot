import { ChatInputCommandInteraction, EmbedBuilder, Interaction } from "discord.js";
import { prisma } from "../index";

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
        content: `${targetUser.id === cmd.user.id ? "You don't" : "This user doesn't"} have a ToxicLinks account yet.`,
        ephemeral: true,
      });
      return;
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const badgeText = dbUser.badges.map((b) => `\`${b.type}\``).join(" ") || "None";

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle(dbUser.displayName || dbUser.username)
      .setURL(`${appUrl}/${dbUser.username}`)
      .setDescription(dbUser.bio || "*No bio set*")
      .setThumbnail(dbUser.avatarUrl || dbUser.image || targetUser.displayAvatarURL())
      .addFields(
        { name: "Username", value: `@${dbUser.username}`, inline: true },
        { name: "Plan", value: dbUser.plan, inline: true },
        { name: "Views", value: `${dbUser.profile?.totalViews || 0}`, inline: true },
        { name: "Badges", value: badgeText, inline: false },
      );

    if (dbUser.links.length > 0) {
      const linkText = dbUser.links
        .map((l) => `[${l.title}](${l.url})`)
        .join("\n");
      embed.addFields({ name: "Links", value: linkText });
    }

    if (dbUser.bannerUrl) {
      embed.setImage(dbUser.bannerUrl);
    }

    embed.setFooter({ text: "ToxicLinks" });
    embed.setTimestamp();

    await cmd.reply({ embeds: [embed] });
  },
};
