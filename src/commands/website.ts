import {
  ChatInputCommandInteraction, GuildMember, Interaction, TextChannel,
  ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
} from "discord.js";
import { BOT_COLOR, APP_URL, APP_NAME, BOT_FOOTER } from "../config";
import { ephemeralErrorV2, ephemeralSuccessV2 } from "../utils/embeds";
import { BANNER_GIF, LOGO, EMOJI_NAMES, guildEmoji, guildEmojiObj } from "../utils/branding";

export const websiteCommand = {
  name: "website",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await cmd.reply(ephemeralErrorV2("You need **Manage Server** permission."));
      return;
    }

    const ch = cmd.channel as TextChannel;
    const guild = cmd.guild!;

    // Resolve custom emojis from guild cache
    const eWebsite = guildEmoji(guild, EMOJI_NAMES.website, "🌐");
    const eDashboard = guildEmoji(guild, EMOJI_NAMES.dashboard, "📊");
    const eShop = guildEmoji(guild, EMOJI_NAMES.shop, "🛒");
    const eSupport = guildEmoji(guild, EMOJI_NAMES.support, "🎫");
    const eVerified = guildEmoji(guild, EMOJI_NAMES.verifiedBadge, "✅");

    // Build the website panel container
    const container = new ContainerBuilder().setAccentColor(BOT_COLOR);

    // Banner
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(BANNER_GIF)
      )
    );

    // Header
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${LOGO} ${APP_NAME}\n` +
        `The **ultimate bio link platform** for gamers, creators, and communities.\n` +
        `Build your toxic profile, share your links, and stand out.`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Features list
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${eWebsite} What is ${APP_NAME}?\n` +
        `> ${eVerified} **Custom Bio Pages** — Your own link-in-bio with themes & effects\n` +
        `> ${eDashboard} **Dashboard** — Manage links, analytics, badges & more\n` +
        `> ${eShop} **Shop** — Premium themes, fonts, cursors & backgrounds\n` +
        `> ${eSupport} **Discord Integration** — Live presence, auto-sync & role badges`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Website button section
    const websiteSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${eWebsite} Visit Website\n-# Create your profile and start customizing.`
        )
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setLabel("Website")
          .setURL(APP_URL)
          .setStyle(ButtonStyle.Link)
      );
    container.addSectionComponents(websiteSection);

    // Dashboard button section
    const dashSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${eDashboard} Dashboard\n-# Manage your links, themes, badges & analytics.`
        )
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setLabel("Dashboard")
          .setURL(`${APP_URL}/dashboard`)
          .setStyle(ButtonStyle.Link)
      );
    container.addSectionComponents(dashSection);

    // Create Profile button section
    const profileSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${LOGO} Create Profile\n-# Sign up and build your toxic bio link page.`
        )
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setLabel("Sign Up")
          .setURL(`${APP_URL}/register`)
          .setStyle(ButtonStyle.Link)
      );
    container.addSectionComponents(profileSection);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Footer
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
    );

    await ch.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });

    await cmd.reply(ephemeralSuccessV2("Website panel posted!"));
  },
};
