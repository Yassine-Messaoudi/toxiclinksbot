import {
  ChatInputCommandInteraction, Interaction, GuildMember, TextChannel,
  EmbedBuilder, PermissionFlagsBits, ChannelType, CategoryChannel,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags,
} from "discord.js";
import { BOT_COLOR, APP_NAME, BOT_FOOTER } from "../config";
import { errorEmbed, successEmbed } from "../utils/embeds";
import { BANNER_GIF, LOGO } from "../utils/branding";

/** Asset types that map to channel names */
const ASSET_TYPES = [
  { name: "Background", value: "backgrounds", emoji: "🖼️" },
  { name: "PFP", value: "pfps", emoji: "👤" },
  { name: "Banner", value: "banners", emoji: "🏳️" },
  { name: "Cursor", value: "cursors", emoji: "🖱️" },
  { name: "Icon", value: "icons", emoji: "✨" },
  { name: "Audio", value: "audios", emoji: "🎵" },
  { name: "Custom Font", value: "custom-fonts", emoji: "🔤" },
];

export const postAssetCommand = {
  name: "post-asset",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const member = cmd.member as GuildMember;
    if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await cmd.reply({ embeds: [errorEmbed("Staff only. You need **Manage Messages** permission.")], ephemeral: true });
      return;
    }

    const sub = cmd.options.getSubcommand();

    // ─── /post-asset single ───
    if (sub === "single") {
      const type = cmd.options.getString("type", true);
      const url = cmd.options.getString("url", true).trim();
      const title = cmd.options.getString("title") || null;
      const tags = cmd.options.getString("tags") || null;

      await cmd.deferReply({ ephemeral: true });

      const assetInfo = ASSET_TYPES.find(a => a.value === type);
      if (!assetInfo) {
        await cmd.editReply({ embeds: [errorEmbed("Invalid asset type.")] });
        return;
      }

      // Find the target channel
      const guild = cmd.guild!;
      const assetsCategory = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "assets"
      ) as CategoryChannel | undefined;

      if (!assetsCategory) {
        await cmd.editReply({ embeds: [errorEmbed("No **assets** category found. Run `/scrape setup` first.")] });
        return;
      }

      const targetCh = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.name === type && c.parentId === assetsCategory.id
      ) as TextChannel | undefined;

      if (!targetCh) {
        await cmd.editReply({ embeds: [errorEmbed(`Channel **#${type}** not found under the assets category.`)] });
        return;
      }

      // Detect file type
      const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
      const isVideo = /\.(mp4|mov|webm)(\?.*)?$/i.test(url);
      const isAudio = /\.(mp3|ogg|wav|flac|m4a)(\?.*)?$/i.test(url);

      const descParts: string[] = [];
      if (title) descParts.push(`**${title}**`);
      if (tags) descParts.push(`> Tags: ${tags.split(",").map(t => `\`${t.trim()}\``).join(" ")}`);
      descParts.push(`> Posted by <@${cmd.user.id}>`);

      if (isImage) {
        const embed = new EmbedBuilder()
          .setColor(BOT_COLOR)
          .setDescription(descParts.join("\n"))
          .setImage(url)
          .setFooter({ text: `${assetInfo.emoji} ${assetInfo.name} • ${BOT_FOOTER}` })
          .setTimestamp();

        const msg = await targetCh.send({ embeds: [embed] });
        try { await msg.react("🔥"); await msg.react("💾"); } catch {}
      } else if (isVideo) {
        const msg = await targetCh.send({
          content: `${assetInfo.emoji} **${assetInfo.name.toUpperCase()}** — 🎬 Video\n${descParts.join("\n")}\n${url}`,
        });
        try { await msg.react("🔥"); await msg.react("💾"); } catch {}
      } else if (isAudio) {
        const msg = await targetCh.send({
          content: `${assetInfo.emoji} **${assetInfo.name.toUpperCase()}** — 🎵 Audio\n${descParts.join("\n")}\n${url}`,
        });
        try { await msg.react("🔥"); await msg.react("💾"); } catch {}
      } else {
        const msg = await targetCh.send({
          content: `${assetInfo.emoji} **${assetInfo.name.toUpperCase()}**\n${descParts.join("\n")}\n${url}`,
        });
        try { await msg.react("🔥"); await msg.react("💾"); } catch {}
      }

      await cmd.editReply({ embeds: [successEmbed(`Asset posted to <#${targetCh.id}>!`)] });
      return;
    }

    // ─── /post-asset bulk ───
    if (sub === "bulk") {
      const type = cmd.options.getString("type", true);
      const urlsRaw = cmd.options.getString("urls", true);

      await cmd.deferReply({ ephemeral: true });

      const assetInfo = ASSET_TYPES.find(a => a.value === type);
      if (!assetInfo) {
        await cmd.editReply({ embeds: [errorEmbed("Invalid asset type.")] });
        return;
      }

      const guild = cmd.guild!;
      const assetsCategory = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "assets"
      ) as CategoryChannel | undefined;

      if (!assetsCategory) {
        await cmd.editReply({ embeds: [errorEmbed("No **assets** category found. Run `/scrape setup` first.")] });
        return;
      }

      const targetCh = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.name === type && c.parentId === assetsCategory.id
      ) as TextChannel | undefined;

      if (!targetCh) {
        await cmd.editReply({ embeds: [errorEmbed(`Channel **#${type}** not found under the assets category.`)] });
        return;
      }

      // Parse URLs (space or newline separated)
      const urls = urlsRaw.split(/[\s\n]+/).filter(u => u.startsWith("http"));

      if (urls.length === 0) {
        await cmd.editReply({ embeds: [errorEmbed("No valid URLs found. Separate URLs with spaces or newlines.")] });
        return;
      }

      await cmd.editReply({ embeds: [successEmbed(`⏳ Posting ${urls.length} assets to <#${targetCh.id}>...`)] });

      let posted = 0;
      for (const url of urls) {
        const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(url);

        try {
          if (isImage) {
            const embed = new EmbedBuilder()
              .setColor(BOT_COLOR)
              .setDescription(`> Posted by <@${cmd.user.id}>`)
              .setImage(url)
              .setFooter({ text: `${assetInfo.emoji} ${assetInfo.name} • ${BOT_FOOTER}` })
              .setTimestamp();

            const msg = await targetCh.send({ embeds: [embed] });
            try { await msg.react("🔥"); await msg.react("💾"); } catch {}
          } else {
            const msg = await targetCh.send({
              content: `${assetInfo.emoji} **${assetInfo.name.toUpperCase()}**\n> Posted by <@${cmd.user.id}>\n${url}`,
            });
            try { await msg.react("🔥"); await msg.react("💾"); } catch {}
          }
          posted++;
        } catch (err) {
          console.error(`[PostAsset] Failed to post:`, err);
        }

        // Rate limit protection
        await new Promise(r => setTimeout(r, 1200));
      }

      const container = new ContainerBuilder().setAccentColor(BOT_COLOR);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${LOGO} Bulk Post Complete\n` +
          `**Channel:** <#${targetCh.id}>\n` +
          `**Type:** ${assetInfo.emoji} ${assetInfo.name}\n` +
          `**Posted:** ${posted}/${urls.length} assets`
        )
      );
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
      );

      await cmd.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      return;
    }

    // ─── /post-asset upload ───
    if (sub === "upload") {
      const type = cmd.options.getString("type", true);
      const file = cmd.options.getAttachment("file", true);
      const title = cmd.options.getString("title") || null;
      const tags = cmd.options.getString("tags") || null;

      await cmd.deferReply({ ephemeral: true });

      const assetInfo = ASSET_TYPES.find(a => a.value === type);
      if (!assetInfo) {
        await cmd.editReply({ embeds: [errorEmbed("Invalid asset type.")] });
        return;
      }

      const guild = cmd.guild!;
      const assetsCategory = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "assets"
      ) as CategoryChannel | undefined;

      if (!assetsCategory) {
        await cmd.editReply({ embeds: [errorEmbed("No **assets** category found. Run `/scrape setup` first.")] });
        return;
      }

      const targetCh = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.name === type && c.parentId === assetsCategory.id
      ) as TextChannel | undefined;

      if (!targetCh) {
        await cmd.editReply({ embeds: [errorEmbed(`Channel **#${type}** not found under the assets category.`)] });
        return;
      }

      const isImage = file.contentType?.startsWith("image/") || false;
      const descParts: string[] = [];
      if (title) descParts.push(`**${title}**`);
      if (tags) descParts.push(`> Tags: ${tags.split(",").map(t => `\`${t.trim()}\``).join(" ")}`);
      descParts.push(`> Posted by <@${cmd.user.id}>`);

      if (isImage) {
        const embed = new EmbedBuilder()
          .setColor(BOT_COLOR)
          .setDescription(descParts.join("\n"))
          .setImage(file.url)
          .setFooter({ text: `${assetInfo.emoji} ${assetInfo.name} • ${BOT_FOOTER}` })
          .setTimestamp();

        const msg = await targetCh.send({ embeds: [embed] });
        try { await msg.react("🔥"); await msg.react("💾"); } catch {}
      } else {
        const msg = await targetCh.send({
          content: `${assetInfo.emoji} **${assetInfo.name.toUpperCase()}**\n${descParts.join("\n")}`,
          files: [{ attachment: file.url, name: file.name }],
        });
        try { await msg.react("🔥"); await msg.react("💾"); } catch {}
      }

      await cmd.editReply({ embeds: [successEmbed(`Asset uploaded and posted to <#${targetCh.id}>!`)] });
      return;
    }
  },
};
