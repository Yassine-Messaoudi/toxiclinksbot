import {
  ChatInputCommandInteraction, GuildMember, Interaction, TextChannel,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  AttachmentBuilder,
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

/** Ticket categories */
export const TICKET_CATEGORIES = [
  { value: "support",  label: "Support",                    emoji: "⚡",  question: "Have a general question or need help?" },
  { value: "report",   label: "Report Profile",             emoji: "🛡️", question: "Need to report a user profile?" },
  { value: "account",  label: "Account Recovery",           emoji: "🔑",  question: "Lost access to your account?" },
  { value: "verified", label: "Verified Badge Application", emoji: "☠️",  question: "Want to apply for a verified badge?" },
  { value: "billing",  label: "Purchase / Billing",         emoji: "💳",  question: "Have a question about purchases or billing?" },
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

      // ── Header message with skull GIF banner ──
      const headerEmbed = new EmbedBuilder()
        .setColor(BOT_COLOR)
        .setAuthor({ name: `☠️ ${APP_NAME}`, iconURL: LOGO_URL })
        .setTitle("Support Center")
        .setDescription([
          `Welcome to **${APP_NAME}**`,
          "Select the option that best matches your needs.",
        ].join("\n"))
        .setImage(SKULL_GIF_URL);

      await ch.send({ embeds: [headerEmbed] });

      // ── Each category as its own message: embed + green button inside ──
      for (let i = 0; i < TICKET_CATEGORIES.length; i++) {
        const cat = TICKET_CATEGORIES[i];
        const imgFile = CATEGORY_IMAGES[cat.value] || "Support.png";
        const attachment = new AttachmentBuilder(path.join(IMG_DIR, imgFile), { name: `${cat.value}.png` });

        const catEmbed = new EmbedBuilder()
          .setColor(BOT_COLOR)
          .setDescription([
            `**${cat.question}**`,
            `Press **${cat.label}** to open the matching ticket flow.`,
          ].join("\n"))
          .setThumbnail(`attachment://${cat.value}.png`);

        // Footer on last category
        if (i === TICKET_CATEGORIES.length - 1) {
          catEmbed.addFields({
            name: "\u200b",
            value: [
              `*${LINE}*`,
              `> 📬 Our support team usually responds within **5–30 minutes**.`,
              "> We are currently **not looking** for staff, please do not open tickets for staff applications.",
            ].join("\n"),
          });
          catEmbed.setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL });
          catEmbed.setTimestamp();
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_cat_${cat.value}`)
            .setLabel(cat.label)
            .setEmoji(cat.emoji)
            .setStyle(ButtonStyle.Success),
        );

        await ch.send({ embeds: [catEmbed], components: [row], files: [attachment] });
      }

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
  const catEmoji = catInfo?.emoji || "⚡";
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
    .setTitle(`${catEmoji}  Ticket Opened`)
    .setDescription([
      `Hey <@${userId}>, thanks for reaching out!`,
      "",
      `> **Category:** ${catEmoji} ${catLabel}`,
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
      .setDescription(`**User:** <@${userId}>\n**Category:** ${catEmoji} ${catLabel}\n**Channel:** <#${channel.id}>`)
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
