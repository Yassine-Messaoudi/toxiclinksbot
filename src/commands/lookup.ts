import { ChatInputCommandInteraction, EmbedBuilder, Interaction } from "discord.js";
import { prisma } from "../index";

export const lookupCommand = {
  name: "lookup",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const username = cmd.options.getString("username", true).toLowerCase();

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { pageAliases: { some: { alias: username } } },
        ],
      },
      include: {
        profile: true,
        badges: true,
      },
    });

    if (!dbUser || !dbUser.username) {
      await cmd.reply({
        content: `No profile found for \`${username}\`.`,
        ephemeral: true,
      });
      return;
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";

    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle(dbUser.displayName || dbUser.username)
      .setURL(`${appUrl}/${dbUser.username}`)
      .setDescription(dbUser.bio || "*No bio set*")
      .setThumbnail(dbUser.avatarUrl || dbUser.image || "")
      .addFields(
        { name: "Username", value: `@${dbUser.username}`, inline: true },
        { name: "Plan", value: dbUser.plan, inline: true },
        { name: "Views", value: `${dbUser.profile?.totalViews || 0}`, inline: true },
      )
      .setFooter({ text: "ToxicLinks" })
      .setTimestamp();

    await cmd.reply({ embeds: [embed] });
  },
};
