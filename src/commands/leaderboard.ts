import { ChatInputCommandInteraction, EmbedBuilder, Interaction } from "discord.js";
import { prisma } from "../index";
import { BOT_COLOR, BOT_FOOTER, LOGO_URL, SKULL_GIF_URL } from "../config";
import { EMOJI_NAMES, guildEmoji } from "../utils/branding";

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

    const eLb = guildEmoji(cmd.guild, EMOJI_NAMES.leaderboard);
    const eLogo = guildEmoji(cmd.guild, EMOJI_NAMES.logoNoBg);
    const eVerified = guildEmoji(cmd.guild, EMOJI_NAMES.verified);
    const list = users
      .map((u, i) => {
        const rank = `**${i + 1}.**`;
        const views = u.profile?.totalViews || 0;
        const badge = u.plan === "PREMIUM" ? ` ${eVerified}` : u.plan === "VERIFIED" ? ` ${eVerified}` : "";
        return `${eLogo} ${rank} **${u.displayName || u.username}**${badge} — ${views.toLocaleString()} views`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(`${eLb} Leaderboard — Top Profiles`)
      .setDescription(list)
      .setThumbnail(SKULL_GIF_URL)
      .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
      .setTimestamp();

    await cmd.reply({ embeds: [embed] });
  },
};
