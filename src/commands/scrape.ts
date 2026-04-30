import {
  ChatInputCommandInteraction, Interaction, GuildMember, TextChannel,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
  MessageFlags, PermissionFlagsBits, ChannelType, CategoryChannel,
  EmbedBuilder, Message,
} from "discord.js";
import { BOT_COLOR, APP_NAME, BOT_FOOTER } from "../config";
import { errorEmbed, successEmbed } from "../utils/embeds";
import { BANNER_GIF, LOGO } from "../utils/branding";
import { client } from "../index";

/** Default asset channel names to create */
const ASSET_CHANNELS = [
  "backgrounds",
  "pfps",
  "banners",
  "cursors",
  "icons",
  "audios",
  "custom-fonts",
];

/** Emoji per asset type for embed decoration */
const ASSET_EMOJI: Record<string, string> = {
  backgrounds: "🖼️",
  pfps: "👤",
  banners: "🏳️",
  cursors: "🖱️",
  icons: "✨",
  audios: "🎵",
  "custom-fonts": "🔤",
};

/** Post a single asset cleanly to the target channel */
async function postAssetEmbed(
  targetChannel: TextChannel,
  url: string,
  _assetType?: string,
  _credit?: string,
): Promise<boolean> {
  try {
    // Just post the URL — Discord auto-embeds images and videos
    await targetChannel.send({ content: url });
    return true;
  } catch (err) {
    console.error(`[Scrape] Failed to post to #${targetChannel.name}:`, err);
    return false;
  }
}

/** Scrape a source channel and post formatted embeds to target */
async function scrapeChannel(
  sourceCh: TextChannel,
  targetCh: TextChannel,
  assetType: string,
  limit: number,
): Promise<{ scanned: number; posted: number }> {
  let totalPosted = 0;
  let totalScanned = 0;
  let lastId: string | undefined;
  let remaining = Math.min(limit, 5000);

  while (remaining > 0) {
    const batchSize = Math.min(remaining, 100);
    const messages = await sourceCh.messages.fetch({
      limit: batchSize,
      ...(lastId ? { before: lastId } : {}),
    });

    if (messages.size === 0) break;

    for (const [, msg] of messages) {
      totalScanned++;
      const urls: string[] = [];
      const credit = msg.author?.username || undefined;

      // Collect attachment URLs
      for (const att of msg.attachments.values()) {
        urls.push(att.url);
      }
      // Collect embed images (some bots post images as embeds)
      for (const embed of msg.embeds) {
        if (embed.image?.url) urls.push(embed.image.url);
        if (embed.thumbnail?.url && !embed.image) urls.push(embed.thumbnail.url);
      }

      if (urls.length === 0) continue;

      for (const url of urls) {
        const ok = await postAssetEmbed(targetCh, url, assetType, credit);
        if (ok) totalPosted++;
        // Rate limit protection: 1s between posts
        await new Promise(r => setTimeout(r, 1200));
      }
    }

    lastId = messages.last()?.id;
    remaining -= messages.size;

    if (remaining > 0) {
      await new Promise(r => setTimeout(r, 800));
    }
  }

  return { scanned: totalScanned, posted: totalPosted };
}

export const scrapeCommand = {
  name: "scrape",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const member = cmd.member as GuildMember;
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      await cmd.reply({ embeds: [errorEmbed("Admin only. This command scrapes assets from other servers.")], ephemeral: true });
      return;
    }

    const sub = cmd.options.getSubcommand();

    // ─── /scrape setup ───
    if (sub === "setup") {
      await cmd.deferReply({ ephemeral: true });

      const guild = cmd.guild!;

      // Find or create "assets" category
      let category = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "assets"
      ) as CategoryChannel | undefined;

      if (!category) {
        category = await guild.channels.create({
          name: "assets",
          type: ChannelType.GuildCategory,
        }) as CategoryChannel;
      }

      const created: string[] = [];
      const existing: string[] = [];

      for (const name of ASSET_CHANNELS) {
        const exists = guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.name === name && c.parentId === category!.id
        );
        if (exists) {
          existing.push(name);
        } else {
          const emoji = ASSET_EMOJI[name] || "📦";
          await guild.channels.create({
            name,
            type: ChannelType.GuildText,
            parent: category.id,
            topic: `${emoji} ${APP_NAME} — ${name} assets. React 🔥 for fire, 💾 to save.`,
          });
          created.push(name);
        }
      }

      const container = new ContainerBuilder().setAccentColor(BOT_COLOR);
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(BANNER_GIF)
        )
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${LOGO} Asset Channels Ready\n` +
          (created.length ? `**Created:** ${created.map(c => `#${c}`).join(", ")}\n` : "") +
          (existing.length ? `**Already existed:** ${existing.map(c => `#${c}`).join(", ")}\n` : "") +
          `\n-# Category: **${category.name}** • ${ASSET_CHANNELS.length} channels`
        )
      );

      await cmd.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      return;
    }

    // ─── /scrape channel ───
    if (sub === "channel") {
      const sourceGuildId = cmd.options.getString("source_guild", true);
      const sourceChannelId = cmd.options.getString("source_channel", true);
      const targetChannel = cmd.options.getChannel("target_channel", true) as TextChannel;
      const limit = cmd.options.getInteger("limit") || 100;

      await cmd.deferReply({ ephemeral: true });

      const sourceGuild = client.guilds.cache.get(sourceGuildId);
      if (!sourceGuild) {
        await cmd.editReply({ embeds: [errorEmbed(`Bot is not in guild \`${sourceGuildId}\`. Add the bot to the source server first.`)] });
        return;
      }

      const sourceCh = sourceGuild.channels.cache.get(sourceChannelId);
      if (!sourceCh || sourceCh.type !== ChannelType.GuildText) {
        await cmd.editReply({ embeds: [errorEmbed(`Channel \`${sourceChannelId}\` not found or not a text channel in **${sourceGuild.name}**.`)] });
        return;
      }

      const sourceTextCh = sourceCh as TextChannel;
      // Detect asset type from target channel name
      const assetType = ASSET_CHANNELS.find(n => targetChannel.name.includes(n)) || targetChannel.name;

      await cmd.editReply({ embeds: [successEmbed(`⏳ Scraping **#${sourceTextCh.name}** from **${sourceGuild.name}**...\nPosting to <#${targetChannel.id}> as branded embeds. This may take a while.`)] });

      const result = await scrapeChannel(sourceTextCh, targetChannel, assetType, limit);

      const container = new ContainerBuilder().setAccentColor(BOT_COLOR);
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(BANNER_GIF)
        )
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${LOGO} Scrape Complete\n` +
          `**Source:** ${sourceGuild.name} → #${sourceTextCh.name}\n` +
          `**Target:** <#${targetChannel.id}>\n` +
          `**Messages scanned:** ${result.scanned.toLocaleString()}\n` +
          `**Assets posted:** ${result.posted.toLocaleString()}`
        )
      );
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
      );

      await cmd.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      return;
    }

    // ─── /scrape all ───
    if (sub === "all") {
      const sourceGuildId = cmd.options.getString("source_guild", true);
      const limit = cmd.options.getInteger("limit") || 100;

      await cmd.deferReply({ ephemeral: true });

      const sourceGuild = client.guilds.cache.get(sourceGuildId);
      if (!sourceGuild) {
        await cmd.editReply({ embeds: [errorEmbed(`Bot is not in guild \`${sourceGuildId}\`. Add the bot to the source server first.`)] });
        return;
      }

      const ourGuild = cmd.guild!;

      const assetsCategory = ourGuild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "assets"
      ) as CategoryChannel | undefined;

      if (!assetsCategory) {
        await cmd.editReply({ embeds: [errorEmbed("No **assets** category found. Run `/scrape setup` first.")] });
        return;
      }

      const sourceAssetCategory = sourceGuild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "assets"
      ) as CategoryChannel | undefined;

      const results: { name: string; scanned: number; posted: number }[] = [];
      let grandTotal = 0;

      await cmd.editReply({ embeds: [successEmbed(`⏳ Scraping all asset channels from **${sourceGuild.name}**...\nThis may take several minutes.`)] });

      for (const assetName of ASSET_CHANNELS) {
        const sourceCh = sourceGuild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.name === assetName &&
            (sourceAssetCategory ? c.parentId === sourceAssetCategory.id : true)
        ) as TextChannel | undefined;

        if (!sourceCh) continue;

        const targetCh = ourGuild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.name === assetName && c.parentId === assetsCategory!.id
        ) as TextChannel | undefined;

        if (!targetCh) continue;

        const result = await scrapeChannel(sourceCh, targetCh, assetName, limit);
        results.push({ name: assetName, ...result });
        grandTotal += result.posted;
      }

      const container = new ContainerBuilder().setAccentColor(BOT_COLOR);
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(BANNER_GIF)
        )
      );

      const resultLines = results.length
        ? results.map(r => `> ${ASSET_EMOJI[r.name] || "📦"} **#${r.name}** — ${r.posted} assets (${r.scanned} scanned)`).join("\n")
        : "> No matching channels found.";

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${LOGO} Full Scrape Complete\n` +
          `**Source server:** ${sourceGuild.name}\n` +
          `**Total assets posted:** ${grandTotal.toLocaleString()}\n\n` +
          resultLines
        )
      );
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
      );

      await cmd.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      return;
    }

    // ─── /scrape fetch (user-token HTTP scraper) ───
    if (sub === "fetch") {
      const sourceChannelId = cmd.options.getString("channel_id", true).trim();
      const targetChannel = cmd.options.getChannel("target_channel", true) as TextChannel;
      const limit = cmd.options.getInteger("limit") || 100;
      const assetType = cmd.options.getString("asset_type") || "backgrounds";

      await cmd.deferReply({ ephemeral: true });

      const userToken = process.env.DISCORD_USER_TOKEN;
      if (!userToken) {
        await cmd.editReply({ embeds: [errorEmbed("**DISCORD_USER_TOKEN** not set in `.env`. Add your user token to scrape external servers.")] });
        return;
      }

      const emoji = ASSET_EMOJI[assetType] || "📦";

      await cmd.editReply({ embeds: [successEmbed(`⏳ Fetching messages from channel \`${sourceChannelId}\` via HTTP API...\nPosting ${emoji} **${assetType}** to <#${targetChannel.id}>.`)] });

      let totalPosted = 0;
      let totalScanned = 0;
      let lastId: string | undefined;
      let remaining = Math.min(limit, 5000);

      try {
        while (remaining > 0) {
          const batchSize = Math.min(remaining, 100);
          let apiUrl = `https://discord.com/api/v10/channels/${sourceChannelId}/messages?limit=${batchSize}`;
          if (lastId) apiUrl += `&before=${lastId}`;

          const res = await fetch(apiUrl, {
            headers: {
              "Authorization": userToken,
              "Content-Type": "application/json",
            },
          });

          if (!res.ok) {
            const errText = await res.text();
            await cmd.editReply({ embeds: [errorEmbed(`Discord API error (${res.status}): ${errText.slice(0, 200)}`)] });
            return;
          }

          const messages = (await res.json()) as any[];
          if (messages.length === 0) break;

          for (const msg of messages) {
            totalScanned++;
            const urls: string[] = [];
            const credit = msg.author?.username || undefined;

            // Attachments
            if (msg.attachments) {
              for (const att of msg.attachments) {
                if (att.url) urls.push(att.url);
              }
            }

            // Embeds with images
            if (msg.embeds) {
              for (const embed of msg.embeds) {
                if (embed.image?.url) urls.push(embed.image.url);
                if (embed.thumbnail?.url && !embed.image) urls.push(embed.thumbnail.url);
              }
            }

            if (urls.length === 0) continue;

            for (const url of urls) {
              const ok = await postAssetEmbed(targetChannel, url, assetType, credit);
              if (ok) totalPosted++;
              await new Promise(r => setTimeout(r, 1500));
            }
          }

          lastId = messages[messages.length - 1]?.id;
          remaining -= messages.length;

          if (remaining > 0) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      } catch (err: any) {
        console.error("[Scrape Fetch] Error:", err);
        await cmd.editReply({ embeds: [errorEmbed(`Fetch error: ${err.message?.slice(0, 200)}`)] });
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
          `# ${LOGO} HTTP Scrape Complete\n` +
          `**Source channel:** \`${sourceChannelId}\`\n` +
          `**Target:** <#${targetChannel.id}>\n` +
          `**Messages scanned:** ${totalScanned.toLocaleString()}\n` +
          `**Assets posted:** ${totalPosted.toLocaleString()}`
        )
      );
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
      );

      await cmd.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      return;
    }
  },
};
