import { ChatInputCommandInteraction, EmbedBuilder, Interaction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { BOT_COLOR, APP_NAME, APP_URL, BOT_FOOTER, LOGO_URL, SKULL_GIF_URL, LINE } from "../config";

export const helpCommand = {
  name: "help",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setAuthor({ name: `${APP_NAME} — Command Center`, iconURL: LOGO_URL })
      .setTitle("☠️  Bot Commands")
      .setDescription([
        `*${LINE}*`,
        "",
        `> Your all-in-one bot for **${APP_NAME}**`,
        "> Manage your profile, view stats, and more — right from Discord.",
        "",
        "```ansi",
        "\u001b[0;32m╔══════════════════════════════════════╗",
        "\u001b[0;32m║        \u001b[1;32m⚡ COMMAND LIST ⚡\u001b[0;32m            ║",
        "\u001b[0;32m╚══════════════════════════════════════╝",
        "```",
      ].join("\n"))
      .addFields(
        {
          name: "☠️ Profile",
          value: [
            "> `/profile [user]` — View a profile card",
            "> `/setbio <text>` — Update your bio",
            "> `/lookup <username>` — Search a profile",
          ].join("\n"),
          inline: true,
        },
        {
          name: "📊 Stats",
          value: [
            "> `/analytics` — Profile analytics",
            "> `/leaderboard` — Top profiles",
            "> `/serverinfo` — Server stats",
            "> `/userinfo [user]` — User info",
          ].join("\n"),
          inline: true,
        },
        { name: "\u200b", value: "\u200b", inline: false },
        {
          name: "⚡ Community",
          value: [
            "> `/suggest <idea>` — Submit idea",
            "> `/poll <question>` — Create a poll",
            "> `/ticket` — Open support ticket",
          ].join("\n"),
          inline: true,
        },
        {
          name: "🛡️ Moderation",
          value: [
            "> `/warn <user>` — Warn a user",
            "> `/mute <user> <dur>` — Timeout",
            "> `/kick <user>` — Kick a user",
            "> `/ban <user>` — Ban a user",
            "> `/purge <amount>` — Bulk delete",
          ].join("\n"),
          inline: true,
        },
        { name: "\u200b", value: "\u200b", inline: false },
        {
          name: "🔧 Staff",
          value: [
            "> `/announce <msg>` — Announcement",
            "> `/giveaway <prize>` — Start giveaway",
            "> `/embed` — Custom embed builder",
          ].join("\n"),
          inline: true,
        },
        {
          name: "🔗 Quick Links",
          value: [
            `> [☠️ Website](${APP_URL})`,
            `> [⚡ Dashboard](${APP_URL}/dashboard)`,
            `> [💬 Discord](https://discord.gg/toxiclinks)`,
          ].join("\n"),
          inline: true,
        },
      )
      .setThumbnail(SKULL_GIF_URL)
      .setImage(SKULL_GIF_URL)
      .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Website")
        .setURL(APP_URL)
        .setStyle(ButtonStyle.Link)
        .setEmoji("☠️"),
      new ButtonBuilder()
        .setLabel("Dashboard")
        .setURL(`${APP_URL}/dashboard`)
        .setStyle(ButtonStyle.Link)
        .setEmoji("⚡"),
    );

    await cmd.reply({ embeds: [embed], components: [row] });
  },
};
