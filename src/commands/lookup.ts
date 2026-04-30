import {
  ChatInputCommandInteraction, Interaction, MessageFlags,
  ButtonBuilder, ButtonStyle,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder, ThumbnailBuilder,
} from "discord.js";
import { prisma } from "../index";
import { BOT_COLOR, APP_URL, BOT_FOOTER } from "../config";
import { ephemeralErrorV2 } from "../utils/embeds";
import { BANNER_GIF, LOGO } from "../utils/branding";

export const lookupCommand = {
  name: "lookup",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const username = cmd.options.getString("username", true).toLowerCase();

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { pageAliases: { some: { alias: username } } },
        ],
      },
      include: {
        profile: true,
        badges: true,
      },
    });

    if (!dbUser || !dbUser.username) {
      await cmd.reply(ephemeralErrorV2(`No profile found for \`${username}\`.`));
      return;
    }

    const profileUrl = `${APP_URL}/${dbUser.username}`;
    const avatarUrl = dbUser.avatarUrl || dbUser.image || "";
    const views = dbUser.profile?.totalViews || 0;
    const badgeText = dbUser.badges.map((b) => `\`${b.type}\``).join(" ") || "None";

    const container = new ContainerBuilder().setAccentColor(BOT_COLOR);

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(BANNER_GIF)
      )
    );

    if (avatarUrl) {
      const header = new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# ${LOGO} ${dbUser.displayName || dbUser.username}\n-# @${dbUser.username} • ${dbUser.plan}`
          )
        )
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl));
      container.addSectionComponents(header);
    } else {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${LOGO} ${dbUser.displayName || dbUser.username}\n-# @${dbUser.username} • ${dbUser.plan}`
        )
      );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${dbUser.bio || "*No bio set*"}\n\n` +
        `> 👁️ **Views:** ${views.toLocaleString()}\n` +
        `> 🏅 **Badges:** ${badgeText}`
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    const linkSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ⚡ View full profile`)
      )
      .setButtonAccessory(
        new ButtonBuilder().setLabel("Open").setURL(profileUrl).setStyle(ButtonStyle.Link)
      );
    container.addSectionComponents(linkSection);

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
    );

    await cmd.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },
};
