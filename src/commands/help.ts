import {
  ChatInputCommandInteraction, Interaction, ButtonBuilder, ButtonStyle,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags,
} from "discord.js";
import { BOT_COLOR, APP_NAME, APP_URL, BOT_FOOTER } from "../config";
import { BANNER_GIF, EMOJI_NAMES, guildEmoji, logoEmoji } from "../utils/branding";

export const helpCommand = {
  name: "help",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const guild = cmd.guild;
    const logo = logoEmoji(guild);
    const eHelp = guildEmoji(guild, EMOJI_NAMES.help);
    const eLeaderboard = guildEmoji(guild, EMOJI_NAMES.leaderboard);
    const eSupport = guildEmoji(guild, EMOJI_NAMES.needhelp);
    const eWebsite = guildEmoji(guild, EMOJI_NAMES.website);
    const eShop = guildEmoji(guild, EMOJI_NAMES.shop);
    const eNote = guildEmoji(guild, EMOJI_NAMES.note);
    const eLogo = guildEmoji(guild, EMOJI_NAMES.logoNoBg);
    const eVerified = guildEmoji(guild, EMOJI_NAMES.verified);
    const eDash = guildEmoji(guild, EMOJI_NAMES.dashboard);

    /** Command categories with emoji + commands */
    const CATEGORIES = [
      {
        emoji: eLogo,
        title: "Profile",
        commands: [
          { cmd: "/profile [user]", desc: "View a profile card" },
          { cmd: "/setbio <text>", desc: "Update your bio" },
          { cmd: "/lookup <username>", desc: "Search a profile" },
          { cmd: "/analytics", desc: "View your profile analytics" },
        ],
      },
      {
        emoji: eLeaderboard,
        title: "Stats & Info",
        commands: [
          { cmd: "/leaderboard", desc: "Top profiles by views" },
          { cmd: "/serverinfo", desc: "Server statistics" },
          { cmd: "/userinfo [user]", desc: "User information" },
          { cmd: "/invites [user]", desc: "Check invite stats" },
        ],
      },
      {
        emoji: eSupport,
        title: "Community",
        commands: [
          { cmd: "/suggest <idea>", desc: "Submit a suggestion" },
          { cmd: "/poll <question>", desc: "Create a poll (up to 5 options)" },
          { cmd: "/ticket panel", desc: "Send the ticket panel" },
          { cmd: "/ticket close", desc: "Close the current ticket" },
        ],
      },
      {
        emoji: eNote,
        title: "Moderation",
        commands: [
          { cmd: "/warn <user>", desc: "Warn a user" },
          { cmd: "/mute <user> <dur>", desc: "Timeout a user" },
          { cmd: "/kick <user>", desc: "Kick a user" },
          { cmd: "/ban <user>", desc: "Ban a user" },
          { cmd: "/purge <amount>", desc: "Bulk delete messages (1-100)" },
          { cmd: "/clear [amount]", desc: "Clear messages or entire channel" },
        ],
      },
      {
        emoji: eWebsite,
        title: "Staff",
        commands: [
          { cmd: "/announce <title> <msg>", desc: "Post an announcement" },
          { cmd: "/giveaway <prize> <dur>", desc: "Start a giveaway" },
          { cmd: "/embed <title> <desc>", desc: "Custom embed builder" },
          { cmd: "/website", desc: "Post the website info panel" },
          { cmd: "/panel rules", desc: "Post the rules panel" },
          { cmd: "/panel pricing", desc: "Post the pricing panel" },
          { cmd: "/panel chat", desc: "Post the chat welcome panel" },
        ],
      },
      {
        emoji: eShop,
        title: "Assets",
        commands: [
          { cmd: "/post-asset single", desc: "Post a single asset by URL" },
          { cmd: "/post-asset bulk", desc: "Post multiple assets by URLs" },
          { cmd: "/post-asset upload", desc: "Upload a file as an asset" },
          { cmd: "/scrape setup", desc: "Create asset category + channels" },
          { cmd: "/scrape channel", desc: "Scrape a single channel" },
          { cmd: "/scrape all", desc: "Scrape all matching channels" },
          { cmd: "/scrape fetch", desc: "Scrape via HTTP API" },
        ],
      },
      {
        emoji: eVerified,
        title: "Admin",
        commands: [
          { cmd: "/setrole <user> <role>", desc: "Change a user's website role" },
          { cmd: "/resetacc <user>", desc: "Reset a user's profile to defaults" },
        ],
      },
    ];

    const totalCmds = CATEGORIES.reduce((a, c) => a + c.commands.length, 0);

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
        `# ${logo} ${APP_NAME} — Command Center\n` +
        `${eHelp} Manage your profile, view stats, and flex — right from Discord.\n` +
        `-# ${totalCmds} commands loaded`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // Each command category as a text block with custom emoji
    for (let i = 0; i < CATEGORIES.length; i++) {
      const cat = CATEGORIES[i];
      const lines = cat.commands.map(c => `> \`${c.cmd}\` — ${c.desc}`).join("\n");
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${cat.emoji} ${cat.title}\n${lines}`)
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
        new TextDisplayBuilder().setContent(`-# ${eDash} Manage your links, themes, badges & more`)
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
        `-# ${logo} ${BOT_FOOTER}`
      )
    );

    await cmd.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
