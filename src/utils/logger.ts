import { Client, TextChannel, EmbedBuilder } from "discord.js";
import { CHANNELS } from "../config";

let logChannel: TextChannel | null = null;

/** Initialize the logger — call once after client is ready */
export function initLogger(client: Client) {
  if (!CHANNELS.BOT_LOGS) return;
  const ch = client.channels.cache.get(CHANNELS.BOT_LOGS);
  if (ch?.isTextBased() && "send" in ch) {
    logChannel = ch as TextChannel;
    console.log("[Bot] Logger initialized → #bot-logs");
  }
}

/** Send an embed to #bot-logs */
export async function logToChannel(embed: EmbedBuilder) {
  if (!logChannel) return;
  try {
    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.warn("[Bot] Failed to log to channel:", (err as Error).message);
  }
}

/** Quick text log to #bot-logs */
export async function logText(message: string) {
  if (!logChannel) return;
  try {
    await logChannel.send({ content: `\`[${new Date().toISOString()}]\` ${message}` });
  } catch {}
}
