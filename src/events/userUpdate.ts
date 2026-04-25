import { User, PartialUser } from "discord.js";
import { PrismaClient } from "@prisma/client";

export async function handleUserUpdate(
  oldUser: User | PartialUser,
  newUser: User,
  prisma: PrismaClient
) {
  // Check if avatar, banner, or decoration changed
  const avatarChanged = oldUser.avatar !== newUser.avatar;
  const bannerChanged = oldUser.banner !== newUser.banner;

  if (!avatarChanged && !bannerChanged) return;

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

  const updateData: Record<string, string> = {};

  if (avatarChanged && connection.autoSyncAvatar) {
    // Use GIF format for animated avatars, PNG for static
    const avatarHash = newUser.avatar;
    const isAnimated = avatarHash?.startsWith("a_");
    const newAvatarUrl = newUser.displayAvatarURL({
      size: 512,
      extension: isAnimated ? "gif" : "png",
      forceStatic: false,
    });
    updateData.avatarUrl = newAvatarUrl;
    updateData.image = newAvatarUrl;
    console.log(`[Bot] Auto-syncing avatar for user ${connection.userId} (animated: ${isAnimated})`);
  }

  if (bannerChanged && connection.autoSyncBanner) {
    // Use GIF format for animated banners, PNG for static
    const bannerHash = newUser.banner;
    const isAnimated = bannerHash?.startsWith("a_");
    const newBannerUrl = newUser.bannerURL({
      size: 1024,
      extension: isAnimated ? "gif" : "png",
      forceStatic: false,
    });
    if (newBannerUrl) {
      updateData.bannerUrl = newBannerUrl;
      console.log(`[Bot] Auto-syncing banner for user ${connection.userId} (animated: ${isAnimated})`);
    }
  }

  if (Object.keys(updateData).length > 0) {
    try {
      await prisma.user.update({
        where: { id: connection.userId },
        data: updateData,
      });
      console.log(`[Bot] Updated user ${connection.userId}:`, Object.keys(updateData));
    } catch (err) {
      console.error("[Bot] Failed to update user:", (err as Error).message);
    }
  }
}
