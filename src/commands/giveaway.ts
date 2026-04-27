import {
  ChatInputCommandInteraction, GuildMember, Interaction, TextChannel,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} from "discord.js";
import { isStaff } from "../utils/permissions";
import { errorEmbed, successEmbed } from "../utils/embeds";
import { BOT_COLOR, CHANNELS, BOT_FOOTER, LOGO_URL, SKULL_GIF_URL, LINE, APP_NAME } from "../config";

/** In-memory giveaway store (production would use DB/Redis) */
export const activeGiveaways = new Map<string, {
  prize: string;
  winners: number;
  endsAt: number;
  channelId: string;
  messageId: string;
  hostId: string;
  entries: Set<string>;
}>();

export const giveawayCommand = {
  name: "giveaway",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isStaff(member)) {
      await cmd.reply({ embeds: [errorEmbed("Staff only command.")], ephemeral: true });
      return;
    }

    const prize = cmd.options.getString("prize", true);
    const duration = cmd.options.getString("duration", true);
    const winners = cmd.options.getInteger("winners") || 1;

    // Parse duration (e.g., "1h", "30m", "1d", "7d")
    const match = duration.match(/^(\d+)(m|h|d)$/i);
    if (!match) {
      await cmd.reply({ embeds: [errorEmbed("Invalid duration. Use format: `30m`, `1h`, `1d`, `7d`")], ephemeral: true });
      return;
    }

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 };
    const ms = amount * (multipliers[unit] || 0);
    if (ms < 60_000 || ms > 30 * 86_400_000) {
      await cmd.reply({ embeds: [errorEmbed("Duration must be between 1 minute and 30 days.")], ephemeral: true });
      return;
    }

    const endsAt = Date.now() + ms;
    const channelId = CHANNELS.GIVEAWAYS || cmd.channelId;
    const channel = cmd.guild?.channels.cache.get(channelId) as TextChannel | undefined;

    if (!channel) {
      await cmd.reply({ embeds: [errorEmbed("Giveaway channel not found.")], ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setAuthor({ name: `${APP_NAME} — Giveaway`, iconURL: LOGO_URL })
      .setTitle("☠️  GIVEAWAY")
      .setDescription([
        `*${LINE}*`,
        "",
        `> 🎁 **Prize:** ${prize}`,
        "",
        "```ansi",
        "\u001b[0;32m╔══════════════════════════════════╗",
        `\u001b[0;32m║  \u001b[1;32m🏆 Winners: \u001b[0;37m${winners}`,
        `\u001b[0;32m║  \u001b[1;32m⏰ Ends:    \u001b[0;37m<t:${Math.floor(endsAt / 1000)}:R>`,
        `\u001b[0;32m║  \u001b[1;32m👤 Host:   \u001b[0;37m${cmd.user.tag}`,
        "\u001b[0;32m╚══════════════════════════════════╝",
        "```",
        "",
        "> ⚡ Click the button below to **enter**!",
        "",
        `*${LINE}*`,
      ].join("\n"))
      .setThumbnail(SKULL_GIF_URL)
      .setImage(SKULL_GIF_URL)
      .setFooter({ text: `${winners} winner(s) • ${BOT_FOOTER}`, iconURL: LOGO_URL })
      .setTimestamp(new Date(endsAt));

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("giveaway_enter")
        .setLabel("🎉 Enter Giveaway")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("giveaway_entries")
        .setLabel("👥 Entries")
        .setStyle(ButtonStyle.Secondary),
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });

    activeGiveaways.set(msg.id, {
      prize,
      winners,
      endsAt,
      channelId: channel.id,
      messageId: msg.id,
      hostId: cmd.user.id,
      entries: new Set(),
    });

    // Schedule end
    setTimeout(async () => {
      const giveaway = activeGiveaways.get(msg.id);
      if (!giveaway) return;

      const entriesArr = Array.from(giveaway.entries);
      const winnerIds: string[] = [];
      const copy = [...entriesArr];
      for (let i = 0; i < Math.min(giveaway.winners, copy.length); i++) {
        const idx = Math.floor(Math.random() * copy.length);
        winnerIds.push(copy.splice(idx, 1)[0]);
      }

      const winnerMentions = winnerIds.length > 0
        ? winnerIds.map(id => `<@${id}>`).join(", ")
        : "No valid entries 😔";

      const endEmbed = new EmbedBuilder()
        .setColor(0xfbbf24)
        .setAuthor({ name: `${APP_NAME} — Giveaway Ended`, iconURL: LOGO_URL })
        .setTitle("☠️  GIVEAWAY ENDED")
        .setDescription([
          `*${LINE}*`,
          "",
          `> 🎁 **Prize:** ${giveaway.prize}`,
          "",
          "```ansi",
          "\u001b[0;33m╔══════════════════════════════════╗",
          `\u001b[0;33m║  \u001b[1;33m🏆 Winner(s): \u001b[0;37m${winnerMentions}`,
          `\u001b[0;33m║  \u001b[1;33m👥 Entries:   \u001b[0;37m${entriesArr.length}`,
          `\u001b[0;33m║  \u001b[1;33m👤 Host:     \u001b[0;37m<@${giveaway.hostId}>`,
          "\u001b[0;33m╚══════════════════════════════════╝",
          "```",
          "",
          `*${LINE}*`,
        ].join("\n"))
        .setThumbnail(SKULL_GIF_URL)
        .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
        .setTimestamp();

      try {
        await msg.edit({ embeds: [endEmbed], components: [] });
        if (winnerIds.length > 0) {
          await channel.send(`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);
        }
      } catch {}

      activeGiveaways.delete(msg.id);
    }, ms);

    await cmd.reply({ embeds: [successEmbed(`Giveaway started in <#${channelId}>!`)], ephemeral: true });
  },
};
