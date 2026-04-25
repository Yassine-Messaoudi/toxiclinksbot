import { Presence } from "discord.js";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";

export async function handlePresenceUpdate(
  oldPresence: Presence | null,
  newPresence: Presence,
  redis: Redis,
  prisma: PrismaClient
) {
  if (!newPresence?.user) return;

  const discordId = newPresence.user.id;

  // Check if this Discord user has a ToxicLinks account with presence enabled
  const connection = await prisma.discordConnection.findUnique({
    where: { discordId },
    select: { showPresence: true, showActivity: true, userId: true },
  });

  if (!connection || !connection.showPresence) return;

  // Build presence data
  const presenceData: Record<string, unknown> = {
    status: newPresence.status || "offline",
    updatedAt: Date.now(),
  };

  // Track activities (gaming, listening, streaming, etc.)
  if (connection.showActivity && newPresence.activities?.length > 0) {
    const activities = newPresence.activities.map((activity) => ({
      name: activity.name,
      type: activity.type,
      details: activity.details,
      state: activity.state,
      url: activity.url,
      // Spotify data
      ...(activity.name === "Spotify" && {
        spotifyTrack: activity.details,
        spotifyArtist: activity.state,
        spotifyAlbum: activity.assets?.largeText,
        spotifyAlbumArt: activity.assets?.largeImageURL(),
      }),
    }));
    presenceData.activities = activities;
  }

  // Store in Redis with 5-minute TTL
  const key = `presence:${connection.userId}`;
  await redis.set(key, JSON.stringify(presenceData), "EX", 300);
}
