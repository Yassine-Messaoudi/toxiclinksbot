import { ChatInputCommandInteraction, EmbedBuilder, Interaction } from "discord.js";
import { prisma } from "../index";
import { BOT_COLOR, BOT_FOOTER, LOGO_URL, SKULL_GIF_URL } from "../config";

export const leaderboardCommand = {
  name: "leaderboard",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const users = await prisma.user.findMany({
      where: {
        username: { not: null },
        profile: { isPublic: true },
      },
      select: {
        username: true,
        displayName: true,
        plan: true,
        profile: { select: { totalViews: true } },
      },
      orderBy: { profile: { totalViews: "desc" } },
      take: 10,
    });

    if (users.length === 0) {
      await cmd.reply({ content: "No profiles on the leaderboard yet!", ephemeral: true });
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    const list = users
      .map((u, i) => {
        const medal = medals[i] || `**${i + 1}.**`;
        const views = u.profile?.totalViews || 0;
        const badge = u.plan === "PREMIUM" ? " 👑" : u.plan === "VERIFIED" ? " ✅" : "";
        return `${medal} **${u.displayName || u.username}**${badge} — ${views.toLocaleString()} views`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle("🏆 Leaderboard — Top Profiles")
      .setDescription(list)
      .setThumbnail(SKULL_GIF_URL)
      .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
      .setTimestamp();

    await cmd.reply({ embeds: [embed] });
  },
};
