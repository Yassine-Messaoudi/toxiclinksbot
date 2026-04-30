import {
  ChatInputCommandInteraction, GuildMember, Interaction, TextChannel,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
} from "discord.js";
import { isStaff } from "../utils/permissions";
import { ephemeralErrorV2, ephemeralSuccessV2 } from "../utils/embeds";
import { BOT_COLOR, CHANNELS, BOT_FOOTER, WARN_COLOR } from "../config";
import { BANNER_GIF, LOGO } from "../utils/branding";

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

    const container = new ContainerBuilder().setAccentColor(BOT_COLOR);

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(BANNER_GIF)
      )
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${LOGO} GIVEAWAY\n` +
        `> 🎁 **Prize:** ${prize}\n` +
        `> 🏆 **Winners:** ${winners}\n` +
        `> ⏰ **Ends:** <t:${Math.floor(endsAt / 1000)}:R>\n` +
        `> 👤 **Host:** ${cmd.user.displayName}\n\n` +
        `Click below to **enter**!`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

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
    container.addActionRowComponents(row);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
    );

    const msg = await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });

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

      const endContainer = new ContainerBuilder().setAccentColor(WARN_COLOR);
      endContainer.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(BANNER_GIF)
        )
      );
      endContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${LOGO} GIVEAWAY ENDED\n` +
          `> 🎁 **Prize:** ${giveaway.prize}\n` +
          `> 🏆 **Winner(s):** ${winnerMentions}\n` +
          `> 👥 **Entries:** ${entriesArr.length}\n` +
          `> 👤 **Host:** <@${giveaway.hostId}>`
        )
      );
      endContainer.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      endContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
      );

      try {
        await msg.edit({ components: [endContainer], flags: MessageFlags.IsComponentsV2 });
        if (winnerIds.length > 0) {
          await channel.send(`🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`);
        }
      } catch {}

      activeGiveaways.delete(msg.id);
    }, ms);

    await cmd.reply(ephemeralSuccessV2(`Giveaway started in <#${channelId}>!`));
  },
};
