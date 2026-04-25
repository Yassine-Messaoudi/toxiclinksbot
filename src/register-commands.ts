import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View a user's profile card")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The user to view").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("setbio")
    .setDescription("Update your profile bio from Discord")
    .addStringOption((opt) =>
      opt
        .setName("text")
        .setDescription("Your new bio text")
        .setRequired(true)
        .setMaxLength(500)
    ),

  new SlashCommandBuilder()
    .setName("analytics")
    .setDescription("View your profile analytics"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the top profiles by views"),

  new SlashCommandBuilder()
    .setName("lookup")
    .setDescription("Search for a profile by username")
    .addStringOption((opt) =>
      opt
        .setName("username")
        .setDescription("Username to search for")
        .setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

const token = process.env.DISCORD_BOT_TOKEN!;
const clientId = process.env.DISCORD_CLIENT_ID!;

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands...`);

    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    console.log("Successfully registered slash commands globally.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
})();
