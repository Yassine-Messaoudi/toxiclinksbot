import {
  ChatInputCommandInteraction, Interaction, ButtonBuilder, ButtonStyle,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags,
} from "discord.js";
import { BOT_COLOR, APP_NAME, APP_URL, BOT_FOOTER } from "../config";
import { BANNER_GIF, EMOJI_NAMES, guildEmoji, logoEmoji } from "../utils/branding";

/** Command categories */
const CATEGORIES = [
  {
    title: "Profile",
    commands: [
      { cmd: "/profile [user]", desc: "View a profile card" },
      { cmd: "/setbio <text>", desc: "Update your bio" },
      { cmd: "/lookup <username>", desc: "Search a profile" },
    ],
  },
  {
    title: "Stats & Info",
    commands: [
      { cmd: "/analytics", desc: "Profile analytics" },
      { cmd: "/leaderboard", desc: "Top profiles" },
      { cmd: "/serverinfo", desc: "Server stats" },
      { cmd: "/userinfo [user]", desc: "User info" },
    ],
  },
  {
    title: "Community",
    commands: [
      { cmd: "/suggest <idea>", desc: "Submit idea" },
      { cmd: "/poll <question>", desc: "Create a poll" },
      { cmd: "/ticket", desc: "Open support ticket" },
    ],
  },
  {
    title: "Moderation",
    commands: [
      { cmd: "/warn <user>", desc: "Warn a user" },
      { cmd: "/mute <user> <dur>", desc: "Timeout" },
      { cmd: "/kick <user>", desc: "Kick a user" },
      { cmd: "/ban <user>", desc: "Ban a user" },
      { cmd: "/purge <amount>", desc: "Bulk delete" },
    ],
  },
  {
    title: "Staff",
    commands: [
      { cmd: "/announce <msg>", desc: "Announcement" },
      { cmd: "/giveaway <prize>", desc: "Start giveaway" },
      { cmd: "/embed", desc: "Custom embed builder" },
    ],
  },
];

export const helpCommand = {
  name: "help",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const guild = cmd.guild;
    const eHelp = guildEmoji(guild, EMOJI_NAMES.help, "📖");
    const eLeaderboard = guildEmoji(guild, EMOJI_NAMES.leaderboard, "🏆");
    const eSupport = guildEmoji(guild, EMOJI_NAMES.needhelp, "🎫");
    const eWebsite = guildEmoji(guild, EMOJI_NAMES.website, "🌐");
    const eShop = guildEmoji(guild, EMOJI_NAMES.shop, "🛒");
    const eNote = guildEmoji(guild, EMOJI_NAMES.note, "📜");
    const eLogo = guildEmoji(guild, EMOJI_NAMES.logoNoBg, "⚡");

    const container = new ContainerBuilder()
      .setAccentColor(BOT_COLOR);

    // Banner
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(BANNER_GIF)
      )
    );

    // Header
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${logoEmoji(guild)} ${APP_NAME} — Command Center\n${eHelp} Manage your profile, view stats, and flex — right from Discord.\n-# ${CATEGORIES.reduce((a, c) => a + c.commands.length, 0)} commands loaded`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Each command category as a text block
    for (let i = 0; i < CATEGORIES.length; i++) {
      const cat = CATEGORIES[i];
      const lines = cat.commands.map(c => `> \`${c.cmd}\` — ${c.desc}`).join("\n");
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${cat.title}\n${lines}`)
      );

      if (i < CATEGORIES.length - 1) {
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      }
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Quick links as sections with buttons
    const websiteSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${eWebsite} Visit **${APP_NAME}** — build your toxic profile`)
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setLabel("Website")
          .setURL(APP_URL)
          .setStyle(ButtonStyle.Link)
      );
    container.addSectionComponents(websiteSection);

    const dashSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${eLogo} Manage your links, themes, badges & more`)
      )
      .setButtonAccessory(
        new ButtonBuilder()
          .setLabel("Dashboard")
          .setURL(`${APP_URL}/dashboard`)
          .setStyle(ButtonStyle.Link)
      );
    container.addSectionComponents(dashSection);

    // Footer
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${logoEmoji(guild)} ${BOT_FOOTER}`
      )
    );

    await cmd.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
