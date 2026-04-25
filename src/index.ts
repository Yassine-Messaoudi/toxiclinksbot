import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  Interaction,
} from "discord.js";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { profileCommand } from "./commands/profile";
import { setbioCommand } from "./commands/setbio";
import { analyticsCommand } from "./commands/analytics";
import { leaderboardCommand } from "./commands/leaderboard";
import { lookupCommand } from "./commands/lookup";
import { handlePresenceUpdate } from "./events/presenceUpdate";
import { handleUserUpdate } from "./events/userUpdate";

export const prisma = new PrismaClient();

// Redis — optional, gracefully handle missing REDIS_URL
let redisInstance: Redis | null = null;
if (process.env.REDIS_URL) {
  redisInstance = new Redis(process.env.REDIS_URL);
  redisInstance.on("error", (err) => {
    console.warn("[Bot] Redis error (non-fatal):", err.message);
  });
  redisInstance.on("connect", () => {
    console.log("[Bot] Redis connected");
  });
} else {
  console.warn("[Bot] REDIS_URL not set — presence features disabled");
}
export const redis = redisInstance;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
  ],
});

const commands = new Collection<string, { name: string; execute: (interaction: Interaction) => Promise<void> }>();

// Register command handlers
const commandList = [
  profileCommand,
  setbioCommand,
  analyticsCommand,
  leaderboardCommand,
  lookupCommand,
];

for (const cmd of commandList) {
  commands.set(cmd.name, cmd);
}

// Ready event
client.once(Events.ClientReady, (readyClient) => {
  console.log(`[Bot] Logged in as ${readyClient.user.tag}`);
  console.log(`[Bot] Serving ${readyClient.guilds.cache.size} guilds`);
});

// Interaction handler (slash commands)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[Bot] Error executing ${interaction.commandName}:`, error);
    const reply = {
      content: "There was an error executing this command.",
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Presence updates → push to Redis for live profile display
client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {
  if (!redis) return;
  handlePresenceUpdate(oldPresence, newPresence, redis, prisma);
});

// User updates → detect avatar/banner changes
client.on(Events.UserUpdate, (oldUser, newUser) => {
  handleUserUpdate(oldUser, newUser, prisma);
});

// Login
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("[Bot] DISCORD_BOT_TOKEN not set!");
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error("[Bot] Failed to login:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("[Bot] Shutting down...");
  await prisma.$disconnect();
  redis?.disconnect();
  client.destroy();
  process.exit(0);
});
