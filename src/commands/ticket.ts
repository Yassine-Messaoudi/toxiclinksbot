import {
  ChatInputCommandInteraction, GuildMember, Interaction, TextChannel,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  AttachmentBuilder,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder,
  MessageFlags,
  ChannelType, PermissionFlagsBits, CategoryChannel,
} from "discord.js";
import path from "path";
import { BOT_COLOR, CHANNELS, ROLES, BOT_FOOTER, LOGO_URL, SKULL_GIF_URL, LINE, APP_NAME } from "../config";
import { errorEmbed, successEmbed, toxicEmbed } from "../utils/embeds";
import { logToChannel } from "../utils/logger";
import { BANNER_GIF, LOGO, EMOJI as BRAND_EMOJI, EMOJI_NAMES, guildEmoji, guildEmojiObj } from "../utils/branding";

/** Path to img folder */
export const IMG_DIR = path.join(__dirname, "..", "..", "img");

/** Map category → image file */
export const CATEGORY_IMAGES: Record<string, string> = {
  support:  "Support.png",
  report:   "Support.png",
  account:  "account recovery.png",
  verified: "Verified badge application.png",
  billing:  "purshacebilling.png",
};

/** Local emoji aliases (ticket-specific categories use brand + local as fallback) */
const EMOJI = {
  ...BRAND_EMOJI,
  support:  BRAND_EMOJI.support,
  report:   BRAND_EMOJI.support,
  account:  BRAND_EMOJI.store,
  verified: BRAND_EMOJI.verified,
  billing:  BRAND_EMOJI.billing,
  store:    BRAND_EMOJI.store,
};

/** Resolve ticket category emoji from guild cache, with hardcoded fallback */
function resolveTicketEmoji(guild: any, key: string): { id: string; name: string } {
  const nameMap: Record<string, string> = {
    support: EMOJI_NAMES.support,
    report: EMOJI_NAMES.needhelp,
    account: EMOJI_NAMES.accountRecovery,
    verified: EMOJI_NAMES.verified,
    billing: EMOJI_NAMES.billing,
  };
  const emojiName = nameMap[key];
  if (emojiName && guild) {
    const resolved = guildEmojiObj(guild, emojiName);
    if (resolved) return resolved;
  }
  const fallback = (EMOJI as any)[key];
  return fallback || BRAND_EMOJI.support;
}

/** Ticket categories */
export const TICKET_CATEGORIES = [
  { value: "support",  label: "Support",                    emoji: EMOJI.support,  question: "Have a general question or need help?" },
  { value: "report",   label: "Report Profile",             emoji: EMOJI.report,   question: "Need to report a user profile?" },
  { value: "account",  label: "Account Recovery",           emoji: EMOJI.account,  question: "Lost access to your account?" },
  { value: "verified", label: "Verified Badge Application", emoji: EMOJI.verified, question: "Want to apply for a verified badge?" },
  { value: "billing",  label: "Purchase / Billing",         emoji: EMOJI.billing,  question: "Have a question about purchases or billing?" },
];

export const ticketCommand = {
  name: "ticket",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const sub = cmd.options.getSubcommand();

    if (sub === "panel") {
      const member = cmd.member as GuildMember;
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await cmd.reply({ embeds: [errorEmbed("You need Manage Server permission.")], ephemeral: true });
        return;
      }

      const ch = cmd.channel as TextChannel;

      // ── Components V2: Container with Sections ──
      const container = new ContainerBuilder()
        .setAccentColor(BOT_COLOR);

      // GIF banner at the top
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(BANNER_GIF)
        )
      );

      // Header text with logo emoji
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${LOGO} Support Center\nWelcome to **${APP_NAME}**\n-# Select the option that best matches your needs.`
        )
      );

      // Separator after header
      container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
      );

      const guild = cmd.guild;

      // Section per category: text on the left, button on the right
      for (let i = 0; i < TICKET_CATEGORIES.length; i++) {
        const cat = TICKET_CATEGORIES[i];
        const resolvedEmoji = resolveTicketEmoji(guild, cat.value);
        const emojiStr = `<:${resolvedEmoji.name}:${resolvedEmoji.id}>`;
        const section = new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### ${emojiStr} ${cat.question}\n-# Press **${cat.label}** to open the matching ticket flow.`
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(`ticket_cat_${cat.value}`)
              .setLabel(cat.label)
              .setEmoji(resolvedEmoji)
              .setStyle(ButtonStyle.Success)
          );

        container.addSectionComponents(section);

        // Add toxic divider between categories
        if (i < TICKET_CATEGORIES.length - 1) {
          container.addSeparatorComponents(
            new SeparatorBuilder().setDivider(true)
          );
        }
      }

      // Separator before footer
      container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true)
      );

      // Footer text
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# 📬 Our support team usually responds within **5–30 minutes**. • ${LOGO} ${APP_NAME}`
        )
      );

      await ch.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      await cmd.reply({ embeds: [successEmbed("Ticket panel sent!")], ephemeral: true });
      return;
    }

    if (sub === "close") {
      await closeTicket(cmd);
      return;
    }
  },
};

/** Create a new ticket channel */
export async function createTicket(guild: any, userId: string, username: string, category?: string) {
  // Check for existing ticket (topic contains the user ID)
  const existing = guild.channels.cache.find(
    (c: any) => c.type === ChannelType.GuildText && c.topic?.includes(`(${userId})`)
  );
  if (existing) return { channel: existing, alreadyExists: true };

  // Find or create ticket category
  let discordCategory = guild.channels.cache.find(
    (c: any) => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes("ticket")
  ) as CategoryChannel | undefined;

  const staffRoleId = ROLES.STAFF || ROLES.MOD || ROLES.ADMIN;

  const permOverwrites: any[] = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
  ];
  if (staffRoleId) {
    permOverwrites.push({ id: staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] });
  }

  const catInfo = TICKET_CATEGORIES.find(c => c.value === category);
  const catLabel = catInfo?.label || "Support";
  const catEmojiObj = resolveTicketEmoji(guild, category || "support");
  const catEmojiStr = `<:${catEmojiObj.name}:${catEmojiObj.id}>`;
  const catImageFile = CATEGORY_IMAGES[category || "support"] || "Support.png";

  const bannerAttachment = new AttachmentBuilder(path.join(IMG_DIR, catImageFile), { name: "ticket_banner.png" });

  const reasonSlug = (catLabel || "support").toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 15);

  const channel = await guild.channels.create({
    name: `${reasonSlug}-${username.toLowerCase().slice(0, 15)}`,
    type: ChannelType.GuildText,
    parent: discordCategory?.id || undefined,
    permissionOverwrites: permOverwrites,
    topic: `${catLabel} ticket for ${username} (${userId})`,
  });

  // Send welcome message using Components V2
  const ticketContainer = new ContainerBuilder()
    .setAccentColor(BOT_COLOR);

  // Category banner image
  ticketContainer.addMediaGalleryComponents(
    new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(BANNER_GIF)
    )
  );

  // Header
  ticketContainer.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# ${LOGO} Ticket Opened\n**Category:** ${catEmojiStr} ${catLabel}`
    )
  );

  ticketContainer.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true)
  );

  // Welcome text
  ticketContainer.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `Hey <@${userId}>, thanks for reaching out!\n\n**How to get help:**\n> 1. Describe your issue below\n> 2. Attach any relevant screenshots\n> 3. Wait for a staff member to respond`
    )
  );

  ticketContainer.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true)
  );

  // Close / Claim buttons in a section
  const closeSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# 🔒 Click **Close Ticket** when your issue is resolved.`
      )
    )
    .setButtonAccessory(
      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Close Ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger)
    );

  ticketContainer.addSectionComponents(closeSection);

  const claimSection = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ✋ Staff can **Claim** this ticket.`
      )
    )
    .setButtonAccessory(
      new ButtonBuilder()
        .setCustomId("ticket_claim")
        .setLabel("Claim Ticket")
        .setEmoji("✋")
        .setStyle(ButtonStyle.Primary)
    );

  ticketContainer.addSectionComponents(claimSection);

  // Footer
  ticketContainer.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# ${LOGO} ${APP_NAME} • ${BOT_FOOTER}`
    )
  );

  // Ping first (content can't be used with Components V2)
  await channel.send(`<@${userId}>${staffRoleId ? ` <@&${staffRoleId}>` : ""}`);

  await channel.send({
    components: [ticketContainer],
    flags: MessageFlags.IsComponentsV2,
  });

  await logToChannel(
    toxicEmbed()
      .setTitle("🎫 Ticket Opened")
      .setDescription(`**User:** <@${userId}>\n**Category:** ${catEmojiStr} ${catLabel}\n**Channel:** <#${channel.id}>`)
  );

  return { channel, alreadyExists: false };
}

async function closeTicket(cmd: ChatInputCommandInteraction) {
  const channel = cmd.channel as TextChannel;
  if (!channel.topic?.includes("ticket for")) {
    await cmd.reply({ embeds: [errorEmbed("This command can only be used in a ticket channel.")], ephemeral: true });
    return;
  }

  await cmd.reply({ embeds: [successEmbed("Ticket will be closed in 5 seconds...")] });

  await logToChannel(
    toxicEmbed()
      .setTitle("🎫 Ticket Closed")
      .setDescription(`**Closed by:** ${cmd.user.tag}\n**Channel:** #${channel.name}`)
  );

  setTimeout(async () => {
    try { await channel.delete("Ticket closed"); } catch {}
  }, 5000);
}
