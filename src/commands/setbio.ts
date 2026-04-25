import { ChatInputCommandInteraction, Interaction } from "discord.js";
import { prisma } from "../index";

export const setbioCommand = {
  name: "setbio",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const text = cmd.options.getString("text", true);

    const dbUser = await prisma.user.findFirst({
      where: {
        accounts: {
          some: {
            provider: "discord",
            providerAccountId: cmd.user.id,
          },
        },
      },
    });

    if (!dbUser) {
      await cmd.reply({
        content: "You don't have a ToxicLinks account yet. Create one at the website first!",
        ephemeral: true,
      });
      return;
    }

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { bio: text.slice(0, 500) },
    });

    await cmd.reply({
      content: `Bio updated successfully!\n> ${text.slice(0, 200)}${text.length > 200 ? "..." : ""}`,
      ephemeral: true,
    });
  },
};
