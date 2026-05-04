import {
  ChatInputCommandInteraction, GuildMember, Guild, Interaction, TextChannel, Message,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder,
} from "discord.js";
import path from "path";
import { isStaff } from "../utils/permissions";
import { ephemeralErrorV2, ephemeralSuccessV2 } from "../utils/embeds";
import { EMOJI_NAMES, guildEmojiObj } from "../utils/branding";
import {
  BOT_COLOR, CHANNELS, ROLES, APP_NAME, DISCORD_INVITE, APP_DOMAIN, WARN_COLOR,
} from "../config";

/** Local path to the ToxicLinks logo used as giveaway thumbnail attachment */
const LOGO_PATH = path.join(__dirname, "..", "..", "img", "logo.png");
const LOGO_FILENAME = "logo.png";

/** Booster bonus — boosters & premium get this many entry weights instead of 1 */
const BOOSTER_WEIGHT = 2;

/**
 * In-memory giveaway store. `entries` is a weighted map so that boosters and
 * premium members count more times in the winner draw. `1` = normal entry,
 * `BOOSTER_WEIGHT` = booster/premium entry.
 */
export const activeGiveaways = new Map<string, {
  prize: string;
  winners: number;
  endsAt: number;
  channelId: string;
  messageId: string;
  hostId: string;
  hostDisplay: string;
  entries: Map<string, number>;
}>();

/** Build the giveaway embed — simple EmbedBuilder to match the reference style. */
function buildGiveawayEmbed(g: {
  prize: string;
  winners: number;
  endsAt: number;
  hostId: string;
  entries: Map<string, number>;
}, guild: Guild | null | undefined): EmbedBuilder {
  const endsAtSec = Math.floor(g.endsAt / 1000);

  // Resolve the native "Server Booster" role dynamically — its ID differs per
  // guild so a hardcoded fallback won't work.
  const nativeBoosterRole = guild?.roles.premiumSubscriberRole;
  const roleMentions = [
    nativeBoosterRole && `<@&${nativeBoosterRole.id}>`,
    ROLES.PREMIUM && `<@&${ROLES.PREMIUM}>`,
  ].filter(Boolean);
  const boosterLine = roleMentions.length > 0 ? roleMentions.join("  ") : "*None configured*";

  const lines = [
    `**Ends:** <t:${endsAtSec}:R> (<t:${endsAtSec}:f>)`,
    `**Hosted by:** <@${g.hostId}>`,
    `**Entries:** ${g.entries.size.toLocaleString()}`,
    `**Winners:** ${g.winners}`,
    "",
    `**Boosted Roles (Booster Bonus)**`,
    boosterLine,
    "",
    `${DISCORD_INVITE} | ${APP_DOMAIN}`,
  ];

  return new EmbedBuilder()
    .setColor(BOT_COLOR)
    .setTitle(`${APP_NAME} ${g.prize} Giveaway`)
    .setDescription(lines.join("\n"))
    .setThumbnail(`attachment://${LOGO_FILENAME}`);
}

/**
 * Single Join button row, matching the reference image.
 * Style: Success (green). Emoji: custom `:giveaway_transparent:` server emoji,
 * with a Unicode 🎉 fallback if the custom emoji isn't in the guild cache.
 */
function buildJoinRow(guild: Guild | null | undefined): ActionRowBuilder<ButtonBuilder> {
  const customEmoji = guildEmojiObj(guild, EMOJI_NAMES.giveaway);
  const btn = new ButtonBuilder()
    .setCustomId("giveaway_join")
    .setLabel("Join")
    .setStyle(ButtonStyle.Success);
  btn.setEmoji(customEmoji ?? "🎉");
  return new ActionRowBuilder<ButtonBuilder>().addComponents(btn);
}

/** Re-render the live entry count on the giveaway message. Fails silently. */
export async function refreshGiveawayMessage(message: Message, giveawayId: string) {
  const g = activeGiveaways.get(giveawayId);
  if (!g) return;
  try {
    await message.edit({
      embeds: [buildGiveawayEmbed(g, message.guild)],
      components: [buildJoinRow(message.guild)],
    });
  } catch {}
}

/** Pick N unique winners from the weighted entries map. */
function pickWinners(entries: Map<string, number>, count: number): string[] {
  if (entries.size === 0) return [];
  // Expand weighted pool then draw unique users.
  const pool: string[] = [];
  for (const [id, weight] of entries) {
    for (let i = 0; i < weight; i++) pool.push(id);
  }
  const chosen: string[] = [];
  while (chosen.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const winner = pool[idx];
    chosen.push(winner);
    // Remove ALL copies of that user from pool so they can't win twice.
    for (let i = pool.length - 1; i >= 0; i--) {
      if (pool[i] === winner) pool.splice(i, 1);
    }
  }
  return chosen;
}

export const giveawayCommand = {
  name: "giveaway",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!isStaff(member)) {
      await cmd.reply(ephemeralErrorV2("Staff only command."));
      return;
    }

    const prize = cmd.options.getString("prize", true);
    const duration = cmd.options.getString("duration", true);
    const winners = cmd.options.getInteger("winners") || 1;

    const match = duration.match(/^(\d+)(m|h|d)$/i);
    if (!match) {
      await cmd.reply(ephemeralErrorV2("Invalid duration. Use format: `30m`, `1h`, `1d`, `7d`"));
      return;
    }

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 };
    const ms = amount * (multipliers[unit] || 0);
    if (ms < 60_000 || ms > 30 * 86_400_000) {
      await cmd.reply(ephemeralErrorV2("Duration must be between 1 minute and 30 days."));
      return;
    }

    const endsAt = Date.now() + ms;
    const channelId = CHANNELS.GIVEAWAYS || cmd.channelId;
    const channel = cmd.guild?.channels.cache.get(channelId) as TextChannel | undefined;

    if (!channel) {
      await cmd.reply(ephemeralErrorV2("Giveaway channel not found."));
      return;
    }

    const giveawayState = {
      prize,
      winners,
      endsAt,
      channelId: channel.id,
      messageId: "", // filled after send
      hostId: cmd.user.id,
      hostDisplay: (member?.displayName || cmd.user.username),
      entries: new Map<string, number>(),
    };

    const embed = buildGiveawayEmbed(giveawayState, cmd.guild);
    const attachment = new AttachmentBuilder(LOGO_PATH, { name: LOGO_FILENAME });

    const msg = await channel.send({
      embeds: [embed],
      components: [buildJoinRow(cmd.guild)],
      files: [attachment],
    });

    giveawayState.messageId = msg.id;
    activeGiveaways.set(msg.id, giveawayState);

    // Schedule end
    setTimeout(async () => {
      const giveaway = activeGiveaways.get(msg.id);
      if (!giveaway) return;

      const winnerIds = pickWinners(giveaway.entries, giveaway.winners);
      const winnerMentions = winnerIds.length > 0
        ? winnerIds.map((id) => `<@${id}>`).join(", ")
        : "*No valid entries*";

      const endsAtSec = Math.floor(giveaway.endsAt / 1000);
      const endEmbed = new EmbedBuilder()
        .setColor(WARN_COLOR)
        .setTitle(`${APP_NAME} ${giveaway.prize} Giveaway — Ended`)
        .setDescription([
          `**Ended:** <t:${endsAtSec}:R>`,
          `**Hosted by:** <@${giveaway.hostId}>`,
          `**Entries:** ${giveaway.entries.size.toLocaleString()}`,
          `**Winner${winnerIds.length === 1 ? "" : "s"}:** ${winnerMentions}`,
          "",
          `${DISCORD_INVITE} | ${APP_DOMAIN}`,
        ].join("\n"))
        .setThumbnail(`attachment://${LOGO_FILENAME}`);

      try {
        await msg.edit({ embeds: [endEmbed], components: [] });
        if (winnerIds.length > 0) {
          await channel.send(`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);
        }
      } catch {}

      activeGiveaways.delete(msg.id);
    }, ms);

    await cmd.reply(ephemeralSuccessV2(`Giveaway started in <#${channelId}>!`));
  },
};

/** Returns the weight a member should have when joining (booster bonus). */
export function memberEntryWeight(member: GuildMember | null | undefined): number {
  if (!member) return 1;
  // Use the guild's native booster role (premiumSubscriberRole) — its ID is
  // auto-generated per guild, so we can't rely on a hardcoded ID.
  const nativeBoostRole = member.guild?.roles.premiumSubscriberRole;
  const hasNativeBoost = nativeBoostRole ? member.roles.cache.has(nativeBoostRole.id) : false;
  const hasPremium = ROLES.PREMIUM && member.roles.cache.has(ROLES.PREMIUM);
  const isBoosting = !!member.premiumSince; // fallback check
  return (hasNativeBoost || hasPremium || isBoosting) ? BOOSTER_WEIGHT : 1;
}
