import { ChatInputCommandInteraction, EmbedBuilder, Interaction } from "discord.js";
import { BOT_COLOR, APP_NAME, APP_URL, BOT_FOOTER, LOGO_URL, SKULL_GIF_URL } from "../config";

export const helpCommand = {
  name: "help",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setTitle(`${APP_NAME} Bot — Commands`)
      .setDescription(`Your all-in-one bot for **${APP_NAME}**. Manage your profile, view stats, and more — right from Discord.`)
      .addFields(
        {
          name: "👤 Profile",
          value: [
            "`/profile [user]` — View a user's profile card",
            "`/setbio <text>` — Update your bio from Discord",
            "`/lookup <username>` — Search for a profile",
          ].join("\n"),
        },
        {
          name: "📊 Stats",
          value: [
            "`/analytics` — View your profile analytics",
            "`/leaderboard` — Top profiles by views",
            "`/serverinfo` — Server statistics",
            "`/userinfo [user]` — User information",
          ].join("\n"),
        },
        {
          name: "🎉 Community",
          value: [
            "`/suggest <idea>` — Submit a suggestion",
            "`/poll <question>` — Create a poll",
            "`/ticket` — Open a support ticket",
          ].join("\n"),
        },
        {
          name: "🛡️ Moderation",
          value: [
            "`/warn <user> [reason]` — Warn a user",
            "`/mute <user> <duration> [reason]` — Timeout a user",
            "`/kick <user> [reason]` — Kick a user",
            "`/ban <user> [reason]` — Ban a user",
            "`/purge <amount>` — Bulk delete messages",
          ].join("\n"),
        },
        {
          name: "⚙️ Staff",
          value: [
            "`/announce <message>` — Post an announcement",
            "`/giveaway <prize> <duration> <winners>` — Start a giveaway",
            "`/embed` — Build a custom embed",
          ].join("\n"),
        },
        {
          name: "🔗 Links",
          value: `[Website](${APP_URL}) • [Dashboard](${APP_URL}/dashboard) • [Discord](https://discord.gg/toxiclinks)`,
        },
      )
      .setThumbnail(SKULL_GIF_URL)
      .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
      .setTimestamp();

    await cmd.reply({ embeds: [embed] });
  },
};
