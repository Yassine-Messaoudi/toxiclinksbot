import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  // ── Profile ──
  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View a user's profile card")
    .addUserOption((opt) => opt.setName("user").setDescription("The user to view").setRequired(false)),

  new SlashCommandBuilder()
    .setName("setbio")
    .setDescription("Update your profile bio from Discord")
    .addStringOption((opt) => opt.setName("text").setDescription("Your new bio text").setRequired(true).setMaxLength(500)),

  new SlashCommandBuilder()
    .setName("analytics")
    .setDescription("View your profile analytics"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the top profiles by views"),

  new SlashCommandBuilder()
    .setName("lookup")
    .setDescription("Search for a profile by username")
    .addStringOption((opt) => opt.setName("username").setDescription("Username to search for").setRequired(true)),

  // ── Info ──
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("View all bot commands"),

  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("View information about a user")
    .addUserOption((opt) => opt.setName("user").setDescription("The user to view").setRequired(false)),

  new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("View server statistics"),

  // ── Community ──
  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Submit a suggestion")
    .addStringOption((opt) => opt.setName("idea").setDescription("Your suggestion").setRequired(true).setMaxLength(1000)),

  new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a poll")
    .addStringOption((opt) => opt.setName("question").setDescription("The poll question").setRequired(true).setMaxLength(256))
    .addStringOption((opt) => opt.setName("option1").setDescription("Option 1").setRequired(true).setMaxLength(100))
    .addStringOption((opt) => opt.setName("option2").setDescription("Option 2").setRequired(true).setMaxLength(100))
    .addStringOption((opt) => opt.setName("option3").setDescription("Option 3").setRequired(false).setMaxLength(100))
    .addStringOption((opt) => opt.setName("option4").setDescription("Option 4").setRequired(false).setMaxLength(100))
    .addStringOption((opt) => opt.setName("option5").setDescription("Option 5").setRequired(false).setMaxLength(100)),

  // ── Tickets ──
  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Support ticket system")
    .addSubcommand((sub) => sub.setName("panel").setDescription("Send the ticket panel (staff only)"))
    .addSubcommand((sub) => sub.setName("close").setDescription("Close the current ticket")),

  // ── Staff ──
  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Post an announcement (staff only)")
    .addStringOption((opt) => opt.setName("title").setDescription("Announcement title").setRequired(true).setMaxLength(256))
    .addStringOption((opt) => opt.setName("message").setDescription("Announcement content").setRequired(true).setMaxLength(4000))
    .addBooleanOption((opt) => opt.setName("ping").setDescription("Ping @everyone?").setRequired(false)),

  new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Start a giveaway (staff only)")
    .addStringOption((opt) => opt.setName("prize").setDescription("What are you giving away?").setRequired(true).setMaxLength(256))
    .addStringOption((opt) => opt.setName("duration").setDescription("Duration (e.g. 30m, 1h, 1d, 7d)").setRequired(true))
    .addIntegerOption((opt) => opt.setName("winners").setDescription("Number of winners").setRequired(false).setMinValue(1).setMaxValue(20)),

  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Build and send a custom embed (staff only)")
    .addStringOption((opt) => opt.setName("title").setDescription("Embed title").setRequired(true).setMaxLength(256))
    .addStringOption((opt) => opt.setName("description").setDescription("Embed description").setRequired(true).setMaxLength(4000))
    .addStringOption((opt) => opt.setName("color").setDescription("Hex color (e.g. #39ff14)").setRequired(false))
    .addStringOption((opt) => opt.setName("image").setDescription("Image URL").setRequired(false))
    .addStringOption((opt) => opt.setName("thumbnail").setDescription("Thumbnail URL").setRequired(false))
    .addStringOption((opt) => opt.setName("footer").setDescription("Footer text").setRequired(false))
    .addChannelOption((opt) => opt.setName("channel").setDescription("Target channel (default: current)").setRequired(false)),

  // ── Moderation ──
  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .addUserOption((opt) => opt.setName("user").setDescription("User to warn").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for warning").setRequired(false)),

  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Timeout a user")
    .addUserOption((opt) => opt.setName("user").setDescription("User to mute").setRequired(true))
    .addStringOption((opt) =>
      opt.setName("duration").setDescription("Duration").setRequired(true)
        .addChoices(
          { name: "5 minutes", value: "5m" },
          { name: "15 minutes", value: "15m" },
          { name: "30 minutes", value: "30m" },
          { name: "1 hour", value: "1h" },
          { name: "6 hours", value: "6h" },
          { name: "12 hours", value: "12h" },
          { name: "1 day", value: "1d" },
          { name: "7 days", value: "7d" },
          { name: "28 days", value: "28d" },
        )
    )
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for mute").setRequired(false)),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a user from the server")
    .addUserOption((opt) => opt.setName("user").setDescription("User to kick").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for kick").setRequired(false)),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server")
    .addUserOption((opt) => opt.setName("user").setDescription("User to ban").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for ban").setRequired(false))
    .addIntegerOption((opt) => opt.setName("delete_messages").setDescription("Days of messages to delete (0-7)").setRequired(false).setMinValue(0).setMaxValue(7)),

  new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Bulk delete messages")
    .addIntegerOption((opt) => opt.setName("amount").setDescription("Number of messages (1-100)").setRequired(true).setMinValue(1).setMaxValue(100)),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clear messages (by number or all)")
    .addIntegerOption((opt) => opt.setName("amount").setDescription("Number of messages to clear (1-100)").setRequired(false).setMinValue(1).setMaxValue(100))
    .addBooleanOption((opt) => opt.setName("all").setDescription("Clear ALL messages in the channel").setRequired(false)),
].map((cmd) => cmd.toJSON());

/** Return the serialised slash command array (used by index.ts auto-register) */
export function getSlashCommands() {
  return commands;
}

// ── Standalone execution (npx tsx src/register-commands.ts) ──
const isMain = require.main === module;
if (isMain) {
  const token = process.env.DISCORD_BOT_TOKEN!;
  const clientId = process.env.DISCORD_CLIENT_ID!;
  const guildId = process.env.GUILD_ID || "";

  const rest = new REST({ version: "10" }).setToken(token);

  (async () => {
    try {
      console.log(`Registering ${commands.length} slash commands...`);

      if (guildId) {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log(`Successfully registered ${commands.length} guild commands.`);
      } else {
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log(`Successfully registered ${commands.length} global commands.`);
      }
    } catch (error) {
      console.error("Error registering commands:", error);
    }
  })();
}
