import {
  ChatInputCommandInteraction, GuildMember, Interaction, TextChannel,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, PermissionFlagsBits, CategoryChannel,
} from "discord.js";
import { BOT_COLOR, CHANNELS, ROLES, BOT_FOOTER, LOGO_URL, SKULL_GIF_URL } from "../config";
import { errorEmbed, successEmbed } from "../utils/embeds";
import { logToChannel } from "../utils/logger";
import { toxicEmbed } from "../utils/embeds";

export const ticketCommand = {
  name: "ticket",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const sub = cmd.options.getSubcommand();

    if (sub === "panel") {
      // Staff only: send a ticket panel embed with a button
      const member = cmd.member as GuildMember;
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await cmd.reply({ embeds: [errorEmbed("You need Manage Server permission.")], ephemeral: true });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(BOT_COLOR)
        .setTitle("🎫 Support Tickets")
        .setDescription([
          "Need help? Click the button below to open a support ticket.",
          "",
          "**Please include:**",
          "• A clear description of your issue",
          "• Any relevant screenshots",
          "• Your ToxicLinks username (if applicable)",
          "",
          "Our staff team will respond as soon as possible.",
        ].join("\n"))
        .setThumbnail(SKULL_GIF_URL)
        .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_create")
          .setLabel("📩 Open Ticket")
          .setStyle(ButtonStyle.Success),
      );

      await (cmd.channel as TextChannel).send({ embeds: [embed], components: [row] });
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
export async function createTicket(guild: any, userId: string, username: string) {
  // Check for existing ticket
  const existing = guild.channels.cache.find(
    (c: any) => c.name === `ticket-${username.toLowerCase().slice(0, 20)}` && c.type === ChannelType.GuildText
  );
  if (existing) return { channel: existing, alreadyExists: true };

  // Find or create ticket category
  let category = guild.channels.cache.find(
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

  const channel = await guild.channels.create({
    name: `ticket-${username.toLowerCase().slice(0, 20)}`,
    type: ChannelType.GuildText,
    parent: category?.id || undefined,
    permissionOverwrites: permOverwrites,
    topic: `Support ticket for ${username} (${userId})`,
  });

  // Send welcome message
  const embed = new EmbedBuilder()
    .setColor(BOT_COLOR)
    .setTitle("🎫 Ticket Opened")
    .setDescription([
      `Hey <@${userId}>, thanks for reaching out!`,
      "",
      "A staff member will be with you shortly.",
      "In the meantime, please describe your issue in detail.",
      "",
      "**Click the button below to close this ticket when resolved.**",
    ].join("\n"))
    .setFooter({ text: BOT_FOOTER })
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

  await channel.send({ content: `<@${userId}>${staffRoleId ? ` <@&${staffRoleId}>` : ""}`, embeds: [embed], components: [row] });

  await logToChannel(
    toxicEmbed()
      .setTitle("🎫 Ticket Opened")
      .setDescription(`**User:** <@${userId}>\n**Channel:** <#${channel.id}>`)
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
