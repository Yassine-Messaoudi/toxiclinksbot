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
import { errorEmbed, successEmbed } from "../utils/embeds";
import { logToChannel } from "../utils/logger";
import { toxicEmbed } from "../utils/embeds";

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

/** Custom server emoji IDs — uploaded to the Discord server */
const EMOJI = {
  support:  { id: "1498458293767634995", name: "Support" },
  report:   { id: "1498458293767634995", name: "Support" },
  account:  { id: "1498458227485048984", name: "accountrecovery" },
  verified: { id: "1498458263841145032", name: "Verifiedbadgeapplication" },
  billing:  { id: "1498458208283656323", name: "purshacebilling" },
  store:    { id: "1498458184942227559", name: "store" },
  logo:     { id: "1498466667242721390", name: "toxiclinks" },
};

const TICKET_BANNER_GIF = "https://res.cloudinary.com/db4mpxc2k/image/upload/v1777332752/toxic_skull_banner_dumql1.gif";

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
          new MediaGalleryItemBuilder().setURL(TICKET_BANNER_GIF)
        )
      );

      // Header text with logo emoji
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# <:${EMOJI.logo.name}:${EMOJI.logo.id}> Support Center\nWelcome to **${APP_NAME}**\n-# Select the option that best matches your needs.`
        )
      );

      // Toxic divider
      const toxicDivider = () =>
        new TextDisplayBuilder().setContent(`-# ═══════════ ☠️ **TOXIC** ☠️ ═══════════`);

      container.addTextDisplayComponents(toxicDivider());

      // Section per category: text on the left, button on the right
      for (let i = 0; i < TICKET_CATEGORIES.length; i++) {
        const cat = TICKET_CATEGORIES[i];
        const section = new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### ${cat.question}\n-# Press **${cat.label}** to open the matching ticket flow.`
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId(`ticket_cat_${cat.value}`)
              .setLabel(cat.label)
              .setEmoji(cat.emoji)
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

      // Toxic divider before footer
      container.addTextDisplayComponents(toxicDivider());

      // Footer text
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# 📬 Our support team usually responds within **5–30 minutes**.`
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
  // Check for existing ticket
  const existing = guild.channels.cache.find(
    (c: any) => c.name === `ticket-${username.toLowerCase().slice(0, 20)}` && c.type === ChannelType.GuildText
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
  const catEmojiObj = catInfo?.emoji || EMOJI.support;
  const catEmojiStr = `<:${catEmojiObj.name}:${catEmojiObj.id}>`;
  const catImageFile = CATEGORY_IMAGES[category || "support"] || "Support.png";

  const bannerAttachment = new AttachmentBuilder(path.join(IMG_DIR, catImageFile), { name: "ticket_banner.png" });

  const channel = await guild.channels.create({
    name: `ticket-${username.toLowerCase().slice(0, 20)}`,
    type: ChannelType.GuildText,
    parent: discordCategory?.id || undefined,
    permissionOverwrites: permOverwrites,
    topic: `${catLabel} ticket for ${username} (${userId})`,
  });

  // Send welcome message
  const embed = new EmbedBuilder()
    .setColor(BOT_COLOR)
    .setAuthor({ name: `${APP_NAME} — ${catLabel}`, iconURL: LOGO_URL })
    .setTitle(`${catEmojiStr}  Ticket Opened`)
    .setDescription([
      `Hey <@${userId}>, thanks for reaching out!`,
      "",
      `> **Category:** ${catEmojiStr} ${catLabel}`,
      "",
      `*${LINE}*`,
      "",
      `**How to get help:**`,
      `> 1. Describe your issue below`,
      `> 2. Attach any relevant screenshots`,
      `> 3. Wait for a staff member to respond`,
      "",
      `*${LINE}*`,
      "",
      `🔒 Click **Close Ticket** when your issue is resolved.`,
    ].join("\n"))
    .setImage("attachment://ticket_banner.png")
    .setThumbnail(SKULL_GIF_URL)
    .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("🔒 Close Ticket")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("✋ Claim Ticket")
      .setStyle(ButtonStyle.Primary),
  );

  await channel.send({
    content: `<@${userId}>${staffRoleId ? ` <@&${staffRoleId}>` : ""}`,
    embeds: [embed],
    components: [row],
    files: [bannerAttachment],
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
  if (!channel.name.startsWith("ticket-")) {
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
