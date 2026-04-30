import {
  ChatInputCommandInteraction, Interaction, GuildMember, TextChannel,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder,
  MessageFlags, PermissionFlagsBits, ChannelType, CategoryChannel,
} from "discord.js";
import path from "path";
import { BOT_COLOR, APP_NAME, BOT_FOOTER } from "../config";
import { ephemeralErrorV2 } from "../utils/embeds";
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

/** Active scrape tracking — keyed by `guildId_userId` */
export const activeScrapes = new Map<string, { stopped: boolean }>();

function scrapeKey(guildId: string, userId: string) {
  return `${guildId}_${userId}`;
}

/** Build a V2 status container with stop button */
function statusContainer(text: string): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(BOT_COLOR);
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${LOGO} Scrape\n${text}`));
  c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("scrape_stop").setLabel("⏹ Stop").setStyle(ButtonStyle.Danger)
  );
  c.addActionRowComponents(row);
  c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`));
  return c;
}

/** Build a V2 completion container */
function completionContainer(title: string, body: string): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(BOT_COLOR);
  c.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(BANNER_GIF))
  );
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${LOGO} ${title}\n${body}`));
  c.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`));
  return c;
}

/** Build a V2 error container (for editReply — no flags needed) */
function errorContainer(message: string): ContainerBuilder {
  const c = new ContainerBuilder().setAccentColor(0xff4444);
  c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✖ Error\n${message}\n-# ${LOGO} ${BOT_FOOTER}`));
  return c;
}

/** Clean up ugly filenames — strip site prefixes, long IDs, etc. */
function cleanFilename(raw: string): string {
  let name = raw;
  // Strip common site prefixes  (e.g. "SaveTik.io_", "SnapSave_", "ssstik.io_")
  name = name.replace(/^(SaveTik\.io|SnapSave|ssstik\.io|SnapInsta\.app|ssyoutube|savefrom)[_\-]/i, "");
  // Strip leading long numeric IDs (e.g. "7626789651642174740_")
  name = name.replace(/^\d{10,}_/, "");
  // Strip trailing Discord snowflake-style query params noise — already handled by URL parsing
  return name || raw;
}

/** Extract a clean filename from a Discord CDN URL */
function filenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const decoded = decodeURIComponent(path.basename(pathname));
    return cleanFilename(decoded) || "file";
  } catch {
    return "file";
  }
}

/** Download a URL and return an AttachmentBuilder, or null on failure */
async function downloadAttachment(url: string): Promise<AttachmentBuilder | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const name = filenameFromUrl(url);
    return new AttachmentBuilder(buf, { name });
  } catch {
    return null;
  }
}

/** Post a group of assets as ONE message (preserves source grouping / grid layout) */
async function postAssetGroup(
  targetChannel: TextChannel,
  urls: string[],
): Promise<number> {
  try {
    const attachments: AttachmentBuilder[] = [];
    for (const url of urls) {
      const att = await downloadAttachment(url);
      if (att) attachments.push(att);
    }
    if (attachments.length === 0) return 0;

    // Discord max 10 attachments per message & 25 MB total — split if needed
    const chunks: AttachmentBuilder[][] = [];
    for (let i = 0; i < attachments.length; i += 10) {
      chunks.push(attachments.slice(i, i + 10));
    }

    let posted = 0;
    for (const chunk of chunks) {
      await targetChannel.send({ files: chunk });
      posted += chunk.length;
      if (chunks.length > 1) await new Promise(r => setTimeout(r, 800));
    }
    return posted;
  } catch (err) {
    console.error(`[Scrape] Failed to post to #${targetChannel.name}:`, err);
    return 0;
  }
}

/** Scrape a source channel and post to target — checks stop flag */
async function scrapeChannel(
  sourceCh: TextChannel,
  targetCh: TextChannel,
  _assetType: string,
  limit: number,
  key: string,
): Promise<{ scanned: number; posted: number; stopped: boolean }> {
  let totalPosted = 0;
  let totalScanned = 0;
  let lastId: string | undefined;
  let remaining = Math.min(limit, 5000);

  while (remaining > 0) {
    if (activeScrapes.get(key)?.stopped) return { scanned: totalScanned, posted: totalPosted, stopped: true };

    const batchSize = Math.min(remaining, 100);
    const messages = await sourceCh.messages.fetch({
      limit: batchSize,
      ...(lastId ? { before: lastId } : {}),
    });

    if (messages.size === 0) break;

    for (const [, msg] of messages) {
      if (activeScrapes.get(key)?.stopped) return { scanned: totalScanned, posted: totalPosted, stopped: true };

      totalScanned++;
      const urls: string[] = [];

      for (const att of msg.attachments.values()) {
        urls.push(att.url);
      }
      for (const embed of msg.embeds) {
        if (embed.image?.url) urls.push(embed.image.url);
        if (embed.thumbnail?.url && !embed.image) urls.push(embed.thumbnail.url);
      }

      if (urls.length === 0) continue;

      // Post all attachments from this source message as ONE grouped message
      const posted = await postAssetGroup(targetCh, urls);
      totalPosted += posted;
      await new Promise(r => setTimeout(r, 1500));
    }

    lastId = messages.last()?.id;
    remaining -= messages.size;

    if (remaining > 0) {
      await new Promise(r => setTimeout(r, 800));
    }
  }

  return { scanned: totalScanned, posted: totalPosted, stopped: false };
}

export const scrapeCommand = {
  name: "scrape",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const member = cmd.member as GuildMember;
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      await cmd.reply(ephemeralErrorV2("Admin only. This command scrapes assets from other servers."));
      return;
    }

    const sub = cmd.options.getSubcommand();
    const key = scrapeKey(cmd.guildId!, cmd.user.id);

    // ─── /scrape setup ───
    if (sub === "setup") {
      // Reply immediately with V2 status
      await cmd.reply({
        components: [statusContainer("⏳ Setting up asset channels...")],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });

      const guild = cmd.guild!;

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

      await cmd.editReply({
        components: [completionContainer(
          "Asset Channels Ready",
          (created.length ? `**Created:** ${created.map(c => `#${c}`).join(", ")}\n` : "") +
          (existing.length ? `**Already existed:** ${existing.map(c => `#${c}`).join(", ")}\n` : "") +
          `\n-# Category: **${category.name}** • ${ASSET_CHANNELS.length} channels`
        )],
      });
      return;
    }

    // ─── /scrape channel ───
    if (sub === "channel") {
      const sourceGuildId = cmd.options.getString("source_guild", true);
      const sourceChannelId = cmd.options.getString("source_channel", true);
      const targetChannel = cmd.options.getChannel("target_channel", true) as TextChannel;
      const limit = cmd.options.getInteger("limit") || 100;

      const sourceGuild = client.guilds.cache.get(sourceGuildId);
      if (!sourceGuild) {
        await cmd.reply(ephemeralErrorV2(`Bot is not in guild \`${sourceGuildId}\`. Add the bot to the source server first.`));
        return;
      }

      const sourceCh = sourceGuild.channels.cache.get(sourceChannelId);
      if (!sourceCh || sourceCh.type !== ChannelType.GuildText) {
        await cmd.reply(ephemeralErrorV2(`Channel \`${sourceChannelId}\` not found or not a text channel in **${sourceGuild.name}**.`));
        return;
      }

      const sourceTextCh = sourceCh as TextChannel;
      const assetType = ASSET_CHANNELS.find(n => targetChannel.name.includes(n)) || targetChannel.name;

      // Reply with V2 status + stop button
      activeScrapes.set(key, { stopped: false });
      await cmd.reply({
        components: [statusContainer(`⏳ Scraping **#${sourceTextCh.name}** from **${sourceGuild.name}**...\nPosting to <#${targetChannel.id}>. This may take a while.`)],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });

      const result = await scrapeChannel(sourceTextCh, targetChannel, assetType, limit, key);
      activeScrapes.delete(key);

      await cmd.editReply({
        components: [completionContainer(
          result.stopped ? "Scrape Stopped" : "Scrape Complete",
          `**Source:** ${sourceGuild.name} → #${sourceTextCh.name}\n` +
          `**Target:** <#${targetChannel.id}>\n` +
          `**Messages scanned:** ${result.scanned.toLocaleString()}\n` +
          `**Assets posted:** ${result.posted.toLocaleString()}` +
          (result.stopped ? "\n\n⏹ *Stopped by user*" : "")
        )],
      });
      return;
    }

    // ─── /scrape all ───
    if (sub === "all") {
      const sourceGuildId = cmd.options.getString("source_guild", true);
      const limit = cmd.options.getInteger("limit") || 100;

      const sourceGuild = client.guilds.cache.get(sourceGuildId);
      if (!sourceGuild) {
        await cmd.reply(ephemeralErrorV2(`Bot is not in guild \`${sourceGuildId}\`. Add the bot to the source server first.`));
        return;
      }

      const ourGuild = cmd.guild!;

      const assetsCategory = ourGuild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "assets"
      ) as CategoryChannel | undefined;

      if (!assetsCategory) {
        await cmd.reply(ephemeralErrorV2("No **assets** category found. Run `/scrape setup` first."));
        return;
      }

      const sourceAssetCategory = sourceGuild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "assets"
      ) as CategoryChannel | undefined;

      // Reply with V2 status + stop button
      activeScrapes.set(key, { stopped: false });
      await cmd.reply({
        components: [statusContainer(`⏳ Scraping all asset channels from **${sourceGuild.name}**...\nThis may take several minutes.`)],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });

      const results: { name: string; scanned: number; posted: number }[] = [];
      let grandTotal = 0;
      let wasStopped = false;

      for (const assetName of ASSET_CHANNELS) {
        if (activeScrapes.get(key)?.stopped) { wasStopped = true; break; }

        const sourceCh = sourceGuild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.name === assetName &&
            (sourceAssetCategory ? c.parentId === sourceAssetCategory.id : true)
        ) as TextChannel | undefined;

        if (!sourceCh) continue;

        const targetCh = ourGuild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.name === assetName && c.parentId === assetsCategory!.id
        ) as TextChannel | undefined;

        if (!targetCh) continue;

        const result = await scrapeChannel(sourceCh, targetCh, assetName, limit, key);
        results.push({ name: assetName, ...result });
        grandTotal += result.posted;
        if (result.stopped) { wasStopped = true; break; }
      }

      activeScrapes.delete(key);

      const resultLines = results.length
        ? results.map(r => `> ${ASSET_EMOJI[r.name] || "📦"} **#${r.name}** — ${r.posted} assets (${r.scanned} scanned)`).join("\n")
        : "> No matching channels found.";

      await cmd.editReply({
        components: [completionContainer(
          wasStopped ? "Full Scrape Stopped" : "Full Scrape Complete",
          `**Source server:** ${sourceGuild.name}\n` +
          `**Total assets posted:** ${grandTotal.toLocaleString()}\n\n` +
          resultLines +
          (wasStopped ? "\n\n⏹ *Stopped by user*" : "")
        )],
      });
      return;
    }

    // ─── /scrape fetch (user-token HTTP scraper) ───
    if (sub === "fetch") {
      const sourceChannelId = cmd.options.getString("channel_id", true).trim();
      const targetChannel = cmd.options.getChannel("target_channel", true) as TextChannel;
      const limit = cmd.options.getInteger("limit") || 100;
      const assetType = cmd.options.getString("asset_type") || "backgrounds";

      const userToken = process.env.DISCORD_USER_TOKEN;
      if (!userToken) {
        await cmd.reply(ephemeralErrorV2("**DISCORD_USER_TOKEN** not set in `.env`. Add your user token to scrape external servers."));
        return;
      }

      const emoji = ASSET_EMOJI[assetType] || "📦";

      // Reply with V2 status + stop button
      activeScrapes.set(key, { stopped: false });
      await cmd.reply({
        components: [statusContainer(`⏳ Fetching messages from channel \`${sourceChannelId}\` via HTTP API...\nPosting ${emoji} **${assetType}** to <#${targetChannel.id}>.`)],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });

      let totalPosted = 0;
      let totalScanned = 0;
      let lastId: string | undefined;
      let remaining = Math.min(limit, 5000);
      let wasStopped = false;

      try {
        while (remaining > 0) {
          if (activeScrapes.get(key)?.stopped) { wasStopped = true; break; }

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
            activeScrapes.delete(key);
            await cmd.editReply({ components: [errorContainer(`Discord API error (${res.status}): ${errText.slice(0, 200)}`)] });
            return;
          }

          const messages = (await res.json()) as any[];
          if (messages.length === 0) break;

          for (const msg of messages) {
            if (activeScrapes.get(key)?.stopped) { wasStopped = true; break; }

            totalScanned++;
            const urls: string[] = [];

            if (msg.attachments) {
              for (const att of msg.attachments) {
                if (att.url) urls.push(att.url);
              }
            }

            if (msg.embeds) {
              for (const embed of msg.embeds) {
                if (embed.image?.url) urls.push(embed.image.url);
                if (embed.thumbnail?.url && !embed.image) urls.push(embed.thumbnail.url);
              }
            }

            if (urls.length === 0) continue;

            // Post all attachments from this source message as ONE grouped message
            const posted = await postAssetGroup(targetChannel, urls);
            totalPosted += posted;
            await new Promise(r => setTimeout(r, 1500));
          }

          if (wasStopped) break;

          lastId = messages[messages.length - 1]?.id;
          remaining -= messages.length;

          if (remaining > 0) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      } catch (err: any) {
        console.error("[Scrape Fetch] Error:", err);
        activeScrapes.delete(key);
        await cmd.editReply({ components: [errorContainer(`Fetch error: ${err.message?.slice(0, 200)}`)] });
        return;
      }

      activeScrapes.delete(key);

      await cmd.editReply({
        components: [completionContainer(
          wasStopped ? "HTTP Scrape Stopped" : "HTTP Scrape Complete",
          `**Source channel:** \`${sourceChannelId}\`\n` +
          `**Target:** <#${targetChannel.id}>\n` +
          `**Messages scanned:** ${totalScanned.toLocaleString()}\n` +
          `**Assets posted:** ${totalPosted.toLocaleString()}` +
          (wasStopped ? "\n\n⏹ *Stopped by user*" : "")
        )],
      });
      return;
    }
  },
};
