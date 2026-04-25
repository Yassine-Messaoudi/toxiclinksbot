import { User, PartialUser } from "discord.js";
import { PrismaClient } from "@prisma/client";

export async function handleUserUpdate(
  oldUser: User | PartialUser,
  newUser: User,
  prisma: PrismaClient
) {
  // Check if avatar or banner changed
  const avatarChanged = oldUser.avatar !== newUser.avatar;
  const bannerChanged = oldUser.banner !== newUser.banner;

  if (!avatarChanged && !bannerChanged) return;

  // Find the user's ToxicLinks connection
  const connection = await prisma.discordConnection.findUnique({
    where: { discordId: newUser.id },
    select: {
      userId: true,
      autoSyncAvatar: true,
      autoSyncBanner: true,
    },
  });

  if (!connection) return;

  const updateData: Record<string, string> = {};

  if (avatarChanged && connection.autoSyncAvatar) {
    const newAvatarUrl = newUser.displayAvatarURL({ size: 512, extension: "png" });
    updateData.avatarUrl = newAvatarUrl;
    updateData.image = newAvatarUrl;
    console.log(`[Bot] Auto-syncing avatar for user ${connection.userId}`);
  }

  if (bannerChanged && connection.autoSyncBanner) {
    const newBannerUrl = newUser.bannerURL({ size: 1024, extension: "png" });
    if (newBannerUrl) {
      updateData.bannerUrl = newBannerUrl;
      console.log(`[Bot] Auto-syncing banner for user ${connection.userId}`);
    }
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({
      where: { id: connection.userId },
      data: updateData,
    });
  }
}
