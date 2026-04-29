import {
  ChatInputCommandInteraction, GuildMember, Interaction, TextChannel,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, ButtonBuilder, ButtonStyle,
  MessageFlags, PermissionFlagsBits,
} from "discord.js";
import { BOT_COLOR, APP_NAME, APP_URL, BOT_FOOTER } from "../config";
import { BANNER_GIF, LOGO } from "../utils/branding";
import { errorEmbed, successEmbed } from "../utils/embeds";

export const panelsCommand = {
  name: "panel",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const member = cmd.member as GuildMember;

    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await cmd.reply({ embeds: [errorEmbed("You need **Manage Server** permission.")], ephemeral: true });
      return;
    }

    const sub = cmd.options.getSubcommand();

    if (sub === "rules") return sendRulesPanel(cmd);
    if (sub === "pricing") return sendPricingPanel(cmd);
    if (sub === "chat") return sendChatPanel(cmd);
  },
};

// ═══════════════════════════════════════════════════════════
//  RULES PANEL
// ═══════════════════════════════════════════════════════════
async function sendRulesPanel(cmd: ChatInputCommandInteraction) {
  const ch = cmd.channel as TextChannel;

  const rules = [
    { emoji: "1️⃣", title: "Be Respectful", desc: "No harassment, hate speech, discrimination, or personal attacks. Keep it civil." },
    { emoji: "2️⃣", title: "No NSFW Content", desc: "No explicit, graphic, or NSFW content outside designated channels." },
    { emoji: "3️⃣", title: "No Spam or Self-Promo", desc: "No spam, excessive caps, repeated messages, or unauthorized self-promotion." },
    { emoji: "4️⃣", title: "No Doxxing or Leaking", desc: "Never share personal information of others. Zero tolerance." },
    { emoji: "5️⃣", title: "Follow Discord TOS", desc: "All Discord Terms of Service and Community Guidelines apply here." },
    { emoji: "6️⃣", title: "Use Channels Properly", desc: "Post content in the correct channels. Keep discussions on-topic." },
    { emoji: "7️⃣", title: "Listen to Staff", desc: "Staff decisions are final. If you have an issue, open a ticket." },
    { emoji: "8️⃣", title: "No Alt Accounts to Evade", desc: "Using alt accounts to bypass bans or mutes will result in a permanent ban." },
  ];

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
      `# ${LOGO} ${APP_NAME} — Server Rules\nPlease read and follow these rules to keep our community safe and enjoyable.`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Rules list
  const rulesText = rules.map(r =>
    `> ${r.emoji} **${r.title}**\n> -# ${r.desc}`
  ).join("\n\n");

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(rulesText)
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Consequences
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### ⚠️ Consequences\n> **1st offense** — Warning\n> **2nd offense** — Mute (1h–24h)\n> **3rd offense** — Kick or Ban\n> -# Severe violations may result in an immediate ban.`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Support + footer
  const supportSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# 🎫 Need help or want to report someone? Open a **support ticket**.`
      )
    )
    .setButtonAccessory(
      new ButtonBuilder()
        .setCustomId("rules_ticket")
        .setLabel("Open Ticket")
        .setEmoji("🎫")
        .setStyle(ButtonStyle.Success)
    );
  container.addSectionComponents(supportSection);

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# ${LOGO} ${APP_NAME} • By joining this server you agree to follow these rules. • ${BOT_FOOTER}`
    )
  );

  await ch.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  await cmd.reply({ embeds: [successEmbed("Rules panel sent!")], ephemeral: true });
}

// ═══════════════════════════════════════════════════════════
//  PRICING PANEL
// ═══════════════════════════════════════════════════════════
async function sendPricingPanel(cmd: ChatInputCommandInteraction) {
  const ch = cmd.channel as TextChannel;

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
      `# ${LOGO} ${APP_NAME} — Pricing\nChoose your level of toxic luxury.`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Free tier
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### ☠️ Free — $0 forever\n` +
      `> Aesthetic profile page\n` +
      `> 5 custom links\n` +
      `> 3 free alt themes\n` +
      `> Standard badges\n` +
      `> Basic stalker analytics`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Premium tier
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### 👑 Premium — $4.99/mo\n` +
      `> Unlimited links\n` +
      `> All aesthetic & goth themes\n` +
      `> Premium status badge\n` +
      `> Late-night Discord sync\n` +
      `> Full obsession analytics\n` +
      `> Heartbreak music player\n` +
      `> Cyber profile effects\n` +
      `> Priority support`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Elite tier
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### 💀 Toxic Elite — $9.99/mo\n` +
      `> Everything in Premium\n` +
      `> Exclusive toxic luxury themes\n` +
      `> Elite badge + custom status symbol\n` +
      `> Dominant leaderboard presence\n` +
      `> Early access to features\n` +
      `> Custom CSS injection\n` +
      `> Dark romance profile effects\n` +
      `> Animated entrance (jealousy-inducing)\n` +
      `> Dedicated alt internet support`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // CTA buttons
  const upgradeSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ⚡ Ready to upgrade? Visit the dashboard to subscribe.`
      )
    )
    .setButtonAccessory(
      new ButtonBuilder()
        .setLabel("Upgrade Now")
        .setURL(`${APP_URL}/pricing`)
        .setStyle(ButtonStyle.Link)
    );
  container.addSectionComponents(upgradeSection);

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# ${LOGO} ${BOT_FOOTER} • All plans include a 7-day money-back guarantee.`
    )
  );

  await ch.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  await cmd.reply({ embeds: [successEmbed("Pricing panel sent!")], ephemeral: true });
}

// ═══════════════════════════════════════════════════════════
//  CHAT PANEL ("Join the conversation")
// ═══════════════════════════════════════════════════════════
async function sendChatPanel(cmd: ChatInputCommandInteraction) {
  const ch = cmd.channel as TextChannel;

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
      `# ${LOGO} Welcome to ${APP_NAME}\nThis is the main chat. Say hi, vibe, share your profile, make friends.`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Guidelines
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `### 💬 Chat Guidelines\n` +
      `> Be respectful — no toxicity toward members\n` +
      `> Keep it on-topic — use the right channels\n` +
      `> Share your profile — flex your page\n` +
      `> Have fun — this is your community`
    )
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Quick links
  const profileSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ⚡ Don't have a profile yet? Create one now.`
      )
    )
    .setButtonAccessory(
      new ButtonBuilder()
        .setLabel("Create Profile")
        .setURL(`${APP_URL}/auth/signin`)
        .setStyle(ButtonStyle.Link)
    );
  container.addSectionComponents(profileSection);

  const discordSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# 🔗 Already have a profile? Share it with the community!`
      )
    )
    .setButtonAccessory(
      new ButtonBuilder()
        .setLabel("Dashboard")
        .setURL(`${APP_URL}/dashboard`)
        .setStyle(ButtonStyle.Link)
    );
  container.addSectionComponents(discordSection);

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  // Footer
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# ${LOGO} ${APP_NAME} • Join the conversation 💬 • ${BOT_FOOTER}`
    )
  );

  await ch.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
  await cmd.reply({ embeds: [successEmbed("Chat panel sent!")], ephemeral: true });
}
