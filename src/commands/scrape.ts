import {
  ChatInputCommandInteraction, Interaction, GuildMember, TextChannel,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, ButtonBuilder, ButtonStyle,
  MessageFlags, PermissionFlagsBits, ChannelType, CategoryChannel,
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
          await guild.channels.create({
            name,
            type: ChannelType.GuildText,
            parent: category.id,
            topic: `${APP_NAME} asset channel — ${name}`,
          });
          created.push(name);
        }
      }

      const container = new ContainerBuilder().setAccentColor(BOT_COLOR);
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

      // Validate source guild
      const sourceGuild = client.guilds.cache.get(sourceGuildId);
      if (!sourceGuild) {
        await cmd.editReply({ embeds: [errorEmbed(`Bot is not in guild \`${sourceGuildId}\`. Add the bot to the source server first.`)] });
        return;
      }

      // Validate source channel
      const sourceCh = sourceGuild.channels.cache.get(sourceChannelId);
      if (!sourceCh || sourceCh.type !== ChannelType.GuildText) {
        await cmd.editReply({ embeds: [errorEmbed(`Channel \`${sourceChannelId}\` not found or not a text channel in **${sourceGuild.name}**.`)] });
        return;
      }

      const sourceTextCh = sourceCh as TextChannel;

      // Fetch messages in batches
      let totalAttachments = 0;
      let totalMessages = 0;
      let lastId: string | undefined;
      let remaining = Math.min(limit, 5000);

      await cmd.editReply({ embeds: [successEmbed(`Scraping **#${sourceTextCh.name}** from **${sourceGuild.name}**...\nScanning up to ${remaining} messages.`)] });

      while (remaining > 0) {
        const batchSize = Math.min(remaining, 100);
        const messages = await sourceTextCh.messages.fetch({
          limit: batchSize,
          ...(lastId ? { before: lastId } : {}),
        });

        if (messages.size === 0) break;

        for (const [, msg] of messages) {
          totalMessages++;

          // Collect all image/file URLs from attachments and embeds
          const urls: string[] = [];

          for (const att of msg.attachments.values()) {
            urls.push(att.url);
          }

          // Also grab embed images (some bots post images as embeds)
          for (const embed of msg.embeds) {
            if (embed.image?.url) urls.push(embed.image.url);
            if (embed.thumbnail?.url && !embed.image) urls.push(embed.thumbnail.url);
          }

          if (urls.length === 0) continue;

          // Post each batch of URLs to the target channel
          // Discord allows up to 10 URLs per message — send in chunks
          for (let i = 0; i < urls.length; i += 10) {
            const chunk = urls.slice(i, i + 10);
            const content = chunk.join("\n");
            try {
              await targetChannel.send({ content });
              totalAttachments += chunk.length;
            } catch (err) {
              console.error(`[Scrape] Failed to send to #${targetChannel.name}:`, err);
            }
          }
        }

        lastId = messages.last()?.id;
        remaining -= messages.size;

        // Small delay to avoid rate limits
        if (remaining > 0) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      // Final report
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
          `**Messages scanned:** ${totalMessages.toLocaleString()}\n` +
          `**Assets scraped:** ${totalAttachments.toLocaleString()}`
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

      // Find our "assets" category
      const assetsCategory = ourGuild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "assets"
      ) as CategoryChannel | undefined;

      if (!assetsCategory) {
        await cmd.editReply({ embeds: [errorEmbed("No **assets** category found. Run `/scrape setup` first.")] });
        return;
      }

      // Find source channels that match our asset channel names
      const sourceAssetCategory = sourceGuild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "assets"
      ) as CategoryChannel | undefined;

      const results: { name: string; count: number }[] = [];
      let grandTotal = 0;

      for (const assetName of ASSET_CHANNELS) {
        // Find source channel (under assets category, or just by name)
        const sourceCh = sourceGuild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.name === assetName &&
            (sourceAssetCategory ? c.parentId === sourceAssetCategory.id : true)
        ) as TextChannel | undefined;

        if (!sourceCh) continue;

        // Find our target channel
        const targetCh = ourGuild.channels.cache.find(
          (c) => c.type === ChannelType.GuildText && c.name === assetName && c.parentId === assetsCategory!.id
        ) as TextChannel | undefined;

        if (!targetCh) continue;

        // Scrape
        let count = 0;
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
            const urls: string[] = [];

            for (const att of msg.attachments.values()) {
              urls.push(att.url);
            }
            for (const embed of msg.embeds) {
              if (embed.image?.url) urls.push(embed.image.url);
              if (embed.thumbnail?.url && !embed.image) urls.push(embed.thumbnail.url);
            }

            if (urls.length === 0) continue;

            for (let i = 0; i < urls.length; i += 10) {
              const chunk = urls.slice(i, i + 10);
              try {
                await targetCh.send({ content: chunk.join("\n") });
                count += chunk.length;
              } catch {}
            }
          }

          lastId = messages.last()?.id;
          remaining -= messages.size;
          if (remaining > 0) await new Promise(r => setTimeout(r, 1000));
        }

        results.push({ name: assetName, count });
        grandTotal += count;
      }

      // Final report
      const container = new ContainerBuilder().setAccentColor(BOT_COLOR);
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(BANNER_GIF)
        )
      );

      const resultLines = results.length
        ? results.map(r => `> **#${r.name}** — ${r.count.toLocaleString()} assets`).join("\n")
        : "> No matching channels found.";

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${LOGO} Full Scrape Complete\n` +
          `**Source server:** ${sourceGuild.name}\n` +
          `**Total assets scraped:** ${grandTotal.toLocaleString()}\n\n` +
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
  },
};
