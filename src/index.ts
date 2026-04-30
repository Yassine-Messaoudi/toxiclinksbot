import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  Interaction,
  ActivityType,
  ChatInputCommandInteraction,
  REST,
  Routes,
} from "discord.js";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

// ── Commands ──
import { profileCommand } from "./commands/profile";
import { setbioCommand } from "./commands/setbio";
import { analyticsCommand } from "./commands/analytics";
import { leaderboardCommand } from "./commands/leaderboard";
import { lookupCommand } from "./commands/lookup";
import { helpCommand } from "./commands/help";
import { userinfoCommand } from "./commands/userinfo";
import { serverinfoCommand } from "./commands/serverinfo";
import { announceCommand } from "./commands/announce";
import { giveawayCommand } from "./commands/giveaway";
import { pollCommand } from "./commands/poll";
import { suggestCommand } from "./commands/suggest";
import { ticketCommand } from "./commands/ticket";
import { warnCommand } from "./commands/warn";
import { muteCommand } from "./commands/mute";
import { banCommand } from "./commands/ban";
import { kickCommand } from "./commands/kick";
import { purgeCommand } from "./commands/purge";
import { clearCommand } from "./commands/clear";
import { embedCommand } from "./commands/embed";
import { scrapeCommand } from "./commands/scrape";
import { postAssetCommand } from "./commands/post-asset";
import { panelsCommand } from "./commands/panels";
import { websiteCommand } from "./commands/website";

// ── Events ──
import { handlePresenceUpdate } from "./events/presenceUpdate";
import { handleUserUpdate } from "./events/userUpdate";
import { handleGuildMemberAdd } from "./events/guildMemberAdd";
import { handleGuildMemberRemove } from "./events/guildMemberRemove";
import { handleGuildMemberUpdate } from "./events/guildMemberUpdate";
import { handleButtonInteraction } from "./events/interactionButtons";

// ── Utils ──
import { initLogger, logText } from "./utils/logger";
import { APP_NAME, GUILD_ID } from "./config";

// ── Exports ──
export const prisma = new PrismaClient();

let redisInstance: Redis | null = null;
if (process.env.REDIS_URL) {
  redisInstance = new Redis(process.env.REDIS_URL);
  redisInstance.on("error", (err) => console.warn("[Bot] Redis error (non-fatal):", err.message));
  redisInstance.on("connect", () => console.log("[Bot] Redis connected"));
} else {
  console.warn("[Bot] REDIS_URL not set — presence features disabled");
}
export const redis = redisInstance;

// ── Client ──
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

export { client };

// ── Command registry ──
type Command = { name: string; execute: (interaction: Interaction) => Promise<void> };
const commands = new Collection<string, Command>();

const commandList: Command[] = [
  profileCommand, setbioCommand, analyticsCommand, leaderboardCommand, lookupCommand,
  helpCommand, userinfoCommand, serverinfoCommand,
  announceCommand, giveawayCommand, pollCommand, suggestCommand, ticketCommand,
  warnCommand, muteCommand, banCommand, kickCommand, purgeCommand, clearCommand, embedCommand, scrapeCommand, postAssetCommand, panelsCommand, websiteCommand,
];

for (const cmd of commandList) commands.set(cmd.name, cmd);

// ── Ready ──
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`[Bot] Logged in as ${readyClient.user.tag}`);
  console.log(`[Bot] Serving ${readyClient.guilds.cache.size} guilds`);
  console.log(`[Bot] ${commands.size} commands loaded`);

  // Auto-register slash commands with Discord API
  try {
    const { getSlashCommands } = await import("./register-commands");
    const slashData = getSlashCommands();
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN!);
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(readyClient.user.id, GUILD_ID), { body: slashData });
      console.log(`[Bot] Registered ${slashData.length} guild commands`);
    } else {
      await rest.put(Routes.applicationCommands(readyClient.user.id), { body: slashData });
      console.log(`[Bot] Registered ${slashData.length} global commands`);
    }
  } catch (err) {
    console.error("[Bot] Failed to register commands:", err);
  }

  initLogger(client);
  logText(`🟢 **${APP_NAME} Bot** is online! (${commands.size} commands)`);

  // ── Status rotation ──
  const statuses = [
    () => ({ name: `${readyClient.guilds.cache.reduce((a, g) => a + g.memberCount, 0).toLocaleString()} members`, type: ActivityType.Watching as const }),
    () => ({ name: "toxiclinks.gg", type: ActivityType.Playing as const }),
    () => ({ name: "/help • /profile", type: ActivityType.Listening as const }),
    () => ({ name: `${readyClient.guilds.cache.size} servers`, type: ActivityType.Watching as const }),
    () => ({ name: "your profiles 👀", type: ActivityType.Watching as const }),
  ];
  let idx = 0;
  const rotate = () => {
    const s = statuses[idx % statuses.length]();
    readyClient.user.setActivity(s.name, { type: s.type });
    idx++;
  };
  rotate();
  setInterval(rotate, 30_000);
});

// ── Interaction handler ──
client.on(Events.InteractionCreate, async (interaction) => {
  // Slash commands
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[Bot] Error executing /${interaction.commandName}:`, error);
      const reply = { content: "❌ There was an error executing this command.", ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(reply).catch(() => {});
      else await interaction.reply(reply).catch(() => {});
    }
    return;
  }

  // Button interactions (tickets, giveaways, etc.)
  if (interaction.isButton()) {
    try {
      await handleButtonInteraction(interaction);
    } catch (error) {
      console.error(`[Bot] Error handling button ${interaction.customId}:`, error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => {});
      }
    }
    return;
  }

  // Modal submits
  if (interaction.isModalSubmit()) {
    try {
      const { handleModalSubmit } = await import("./events/interactionModals");
      await handleModalSubmit(interaction);
    } catch (error) {
      console.error(`[Bot] Error handling modal ${interaction.customId}:`, error);
    }
    return;
  }
});

// ── Presence updates ──
client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {
  if (!redis) return;
  handlePresenceUpdate(oldPresence, newPresence, redis, prisma);
});

// ── User updates (avatar/banner sync) ──
client.on(Events.UserUpdate, (oldUser, newUser) => {
  handleUserUpdate(oldUser, newUser, prisma);
});

// ── Member join (own guild only) ──
client.on(Events.GuildMemberAdd, (member) => {
  if (GUILD_ID && member.guild.id !== GUILD_ID) return;
  handleGuildMemberAdd(member, client);
});

// ── Member leave (own guild only) ──
client.on(Events.GuildMemberRemove, (member) => {
  if (GUILD_ID && member.guild.id !== GUILD_ID) return;
  handleGuildMemberRemove(member, client);
});

// ── Member update / boost detection (own guild only) ──
client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
  if (GUILD_ID && newMember.guild.id !== GUILD_ID) return;
  handleGuildMemberUpdate(oldMember, newMember, client);
});

// ── Login ──
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) { console.error("[Bot] DISCORD_BOT_TOKEN not set!"); process.exit(1); }
client.login(token).catch((err) => { console.error("[Bot] Failed to login:", err); process.exit(1); });

// ── Graceful shutdown ──
const shutdown = async () => {
  console.log("[Bot] Shutting down...");
  await logText("🔴 Bot is shutting down...");
  await prisma.$disconnect();
  redis?.disconnect();
  client.destroy();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
