import { User, PartialUser } from "discord.js";
import { PrismaClient } from "@prisma/client";

export async function handleUserUpdate(
  oldUser: User | PartialUser,
  newUser: User,
  prisma: PrismaClient
) {
  // Check if avatar, banner, or display name changed
  const avatarChanged = oldUser.avatar !== newUser.avatar;
  const bannerChanged = oldUser.banner !== newUser.banner;
  const nameChanged =
    oldUser.displayName !== newUser.displayName ||
    oldUser.username !== newUser.username ||
    oldUser.globalName !== newUser.globalName;

  if (!avatarChanged && !bannerChanged && !nameChanged) return;

  // Find the user's ToxicLinks connection
  let connection;
  try {
    connection = await prisma.discordConnection.findUnique({
      where: { discordId: newUser.id },
      select: {
        userId: true,
        autoSyncAvatar: true,
        autoSyncBanner: true,
      },
    });
  } catch (err) {
    console.warn("[Bot] Failed to query DiscordConnection:", (err as Error).message);
    return;
  }

  if (!connection) return;

  console.log(`[Bot] UserUpdate for ${newUser.id}: autoSyncAvatar=${connection.autoSyncAvatar}, autoSyncBanner=${connection.autoSyncBanner}, avatarChanged=${avatarChanged}, bannerChanged=${bannerChanged}, nameChanged=${nameChanged}`);

  const userUpdate: Record<string, string> = {};
  const connectionUpdate: Record<string, string> = {};

  if (nameChanged) {
    const newDisplayName = newUser.globalName || newUser.displayName || newUser.username;
    connectionUpdate.discordDisplayName = newDisplayName;
    connectionUpdate.discordUsername = newUser.username;
    // Only update DiscordConnection — never overwrite the user's custom profile displayName
    console.log(`[Bot] Syncing Discord display name for user ${connection.userId}: "${newDisplayName}"`);
  }

  if (avatarChanged) {
    // Use GIF format for animated avatars, PNG for static
    const avatarHash = newUser.avatar;
    const isAnimated = avatarHash?.startsWith("a_");
    const newAvatarUrl = newUser.displayAvatarURL({
      size: 512,
      extension: isAnimated ? "gif" : "png",
      forceStatic: false,
    });
    // Always update the Discord-specific avatar on the connection
    connectionUpdate.discordAvatarUrl = newAvatarUrl;
    connectionUpdate.discordDisplayName = newUser.displayName || newUser.username;

    if (connection.autoSyncAvatar) {
      userUpdate.avatarUrl = newAvatarUrl;
      userUpdate.image = newAvatarUrl;
      console.log(`[Bot] Auto-syncing avatar for user ${connection.userId} (animated: ${isAnimated})`);
    } else {
      console.log(`[Bot] SKIPPING avatar sync for user ${connection.userId} — autoSyncAvatar is OFF`);
    }
  }

  if (bannerChanged) {
    // Use GIF format for animated banners, PNG for static
    const bannerHash = newUser.banner;
    const isAnimated = bannerHash?.startsWith("a_");
    const newBannerUrl = newUser.bannerURL({
      size: 1024,
      extension: isAnimated ? "gif" : "png",
      forceStatic: false,
    });
    if (newBannerUrl) {
      // Always update the Discord-specific banner on the connection
      connectionUpdate.discordBannerUrl = newBannerUrl;

      if (connection.autoSyncBanner) {
        userUpdate.bannerUrl = newBannerUrl;
        console.log(`[Bot] Auto-syncing banner for user ${connection.userId} (animated: ${isAnimated})`);
      } else {
        console.log(`[Bot] SKIPPING banner sync for user ${connection.userId} — autoSyncBanner is OFF`);
      }
    }
  }

  // Update DiscordConnection with Discord-specific data (always)
  if (Object.keys(connectionUpdate).length > 0) {
    try {
      await prisma.discordConnection.update({
        where: { discordId: newUser.id },
        data: connectionUpdate,
      });
      console.log(`[Bot] Updated DiscordConnection for ${newUser.id}:`, Object.keys(connectionUpdate));
    } catch (err) {
      console.error("[Bot] Failed to update DiscordConnection:", (err as Error).message);
    }
  }

  // Update User model (only if auto-sync is on)
  if (Object.keys(userUpdate).length > 0) {
    try {
      await prisma.user.update({
        where: { id: connection.userId },
        data: userUpdate,
      });
      console.log(`[Bot] Updated user ${connection.userId}:`, Object.keys(userUpdate));
    } catch (err) {
      console.error("[Bot] Failed to update user:", (err as Error).message);
    }
  }
}
