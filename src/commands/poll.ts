import {
  ChatInputCommandInteraction, Interaction, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
} from "discord.js";
import { BOT_COLOR, BOT_FOOTER } from "../config";
import { BANNER_GIF, LOGO } from "../utils/branding";

/** In-memory poll store */
export const activePolls = new Map<string, {
  question: string;
  options: string[];
  votes: Map<string, number>; // userId -> optionIndex
  creatorId: string;
}>();

const OPTION_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];

export const pollCommand = {
  name: "poll",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const question = cmd.options.getString("question", true);
    const opt1 = cmd.options.getString("option1", true);
    const opt2 = cmd.options.getString("option2", true);
    const opt3 = cmd.options.getString("option3") || null;
    const opt4 = cmd.options.getString("option4") || null;
    const opt5 = cmd.options.getString("option5") || null;

    const options = [opt1, opt2, opt3, opt4, opt5].filter(Boolean) as string[];
    const optionLines = options.map((opt, i) => `> ${OPTION_EMOJIS[i]} **${opt}** — \`0 votes\``).join("\n");

    const container = new ContainerBuilder().setAccentColor(BOT_COLOR);

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(BANNER_GIF)
      )
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${LOGO} ${question}\n\n${optionLines}\n\n-# Poll by **${cmd.user.displayName}** • \`0 total votes\``
      )
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    const buttons: ButtonBuilder[] = options.map((opt, i) =>
      new ButtonBuilder()
        .setCustomId(`poll_vote_${i}`)
        .setLabel(opt.slice(0, 80))
        .setEmoji(OPTION_EMOJIS[i])
        .setStyle(ButtonStyle.Secondary)
    );

    for (let i = 0; i < buttons.length; i += 5) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5));
      container.addActionRowComponents(row);
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${LOGO} ${BOT_FOOTER}`)
    );

    const msg = await cmd.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
      fetchReply: true,
    });

    activePolls.set(msg.id, {
      question,
      options,
      votes: new Map(),
      creatorId: cmd.user.id,
    });
  },
};
