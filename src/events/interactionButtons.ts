import { ButtonInteraction, EmbedBuilder, TextChannel } from "discord.js";
import { activeGiveaways } from "../commands/giveaway";
import { activePolls } from "../commands/poll";
import { createTicket } from "../commands/ticket";
import { successEmbed, errorEmbed } from "../utils/embeds";
import { BOT_COLOR, BOT_FOOTER, LOGO_URL, SKULL_GIF_URL, LINE_SHORT, APP_NAME } from "../config";

const OPTION_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];

export async function handleButtonInteraction(interaction: ButtonInteraction) {
  const id = interaction.customId;

  // ── Giveaway buttons ──
  if (id === "giveaway_enter") {
    const giveaway = activeGiveaways.get(interaction.message.id);
    if (!giveaway) {
      await interaction.reply({ embeds: [errorEmbed("This giveaway has ended.")], ephemeral: true });
      return;
    }
    if (giveaway.entries.has(interaction.user.id)) {
      giveaway.entries.delete(interaction.user.id);
      await interaction.reply({ embeds: [successEmbed("You left the giveaway.")], ephemeral: true });
    } else {
      giveaway.entries.add(interaction.user.id);
      await interaction.reply({ embeds: [successEmbed(`You entered the giveaway! (${giveaway.entries.size} entries)`)], ephemeral: true });
    }
    return;
  }

  if (id === "giveaway_entries") {
    const giveaway = activeGiveaways.get(interaction.message.id);
    const count = giveaway?.entries.size || 0;
    await interaction.reply({ content: `👥 **${count}** entr${count === 1 ? "y" : "ies"} so far`, ephemeral: true });
    return;
  }

  // ── Poll vote buttons ──
  if (id.startsWith("poll_vote_")) {
    const optIndex = parseInt(id.replace("poll_vote_", ""));
    const poll = activePolls.get(interaction.message.id);
    if (!poll) {
      await interaction.reply({ embeds: [errorEmbed("This poll is no longer active.")], ephemeral: true });
      return;
    }

    const previousVote = poll.votes.get(interaction.user.id);
    if (previousVote === optIndex) {
      // Remove vote
      poll.votes.delete(interaction.user.id);
      await interaction.reply({ content: "🗳️ Vote removed!", ephemeral: true });
    } else {
      poll.votes.set(interaction.user.id, optIndex);
      await interaction.reply({ content: `🗳️ Voted for **${poll.options[optIndex]}**!`, ephemeral: true });
    }

    // Update the embed with new counts
    const totalVotes = poll.votes.size;
    const counts = poll.options.map((_, i) =>
      Array.from(poll.votes.values()).filter(v => v === i).length
    );

    const description = poll.options.map((opt, i) => {
      const count = counts[i];
      const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
      return `${OPTION_EMOJIS[i]} **${opt}** — ${count} vote${count !== 1 ? "s" : ""} (${pct}%)\n${bar}`;
    }).join("\n\n");

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setAuthor({ name: `${APP_NAME} — Poll`, iconURL: LOGO_URL })
      .setTitle(`☠️  ${poll.question}`)
      .setDescription([
        `*${LINE_SHORT}*`,
        "",
        description,
        "",
        `*${LINE_SHORT}*`,
        "",
        `> ⚡ \`${totalVotes}\` total vote${totalVotes !== 1 ? "s" : ""}`,
      ].join("\n"))
      .setThumbnail(SKULL_GIF_URL)
      .setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL })
      .setTimestamp();

    try {
      await interaction.message.edit({ embeds: [embed] });
    } catch {}
    return;
  }

  // ── Ticket category buttons ──
  if (id.startsWith("ticket_cat_")) {
    const category = id.replace("ticket_cat_", "");
    const guild = interaction.guild;
    if (!guild) return;

    try {
      const result = await createTicket(guild, interaction.user.id, interaction.user.username, category);
      if (result.alreadyExists) {
        await interaction.reply({
          embeds: [errorEmbed(`You already have an open ticket: <#${result.channel.id}>`)],
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          embeds: [successEmbed(`Ticket created: <#${result.channel.id}>`)],
          ephemeral: true,
        });
      }
    } catch (err) {
      await interaction.reply({
        embeds: [errorEmbed(`Failed to create ticket: ${(err as Error).message}`)],
        ephemeral: true,
      });
    }
    return;
  }

  if (id === "ticket_close") {
    const channel = interaction.channel as TextChannel;
    if (!channel.topic?.includes("ticket for")) {
      await interaction.reply({ embeds: [errorEmbed("Not a ticket channel.")], ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [successEmbed("Ticket will be closed in 5 seconds...")] });
    setTimeout(async () => {
      try { await channel.delete("Ticket closed"); } catch {}
    }, 5000);
    return;
  }

  if (id === "ticket_claim") {
    const channel = interaction.channel as TextChannel;
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    const displayName = member?.displayName || interaction.user.username;
    await interaction.reply({
      embeds: [successEmbed(`This ticket has been claimed by **${displayName}**.`)],
    });
    return;
  }
}
