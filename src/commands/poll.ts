import {
  ChatInputCommandInteraction, Interaction, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} from "discord.js";
import { BOT_COLOR, BOT_FOOTER, LOGO_URL } from "../config";

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

    const description = options.map((opt, i) => `${OPTION_EMOJIS[i]} **${opt}** — 0 votes`).join("\n");

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setTitle(`📊 ${question}`)
      .setDescription(description)
      .setFooter({ text: `Poll by ${cmd.user.tag} \u2022 0 total votes \u2022 ${BOT_FOOTER}`, iconURL: LOGO_URL })
      .setTimestamp();

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const buttons: ButtonBuilder[] = options.map((opt, i) =>
      new ButtonBuilder()
        .setCustomId(`poll_vote_${i}`)
        .setLabel(opt.slice(0, 80))
        .setEmoji(OPTION_EMOJIS[i])
        .setStyle(ButtonStyle.Secondary)
    );

    // Discord allows max 5 buttons per row
    for (let i = 0; i < buttons.length; i += 5) {
      rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5)));
    }

    const msg = await cmd.reply({ embeds: [embed], components: rows, fetchReply: true });

    activePolls.set(msg.id, {
      question,
      options,
      votes: new Map(),
      creatorId: cmd.user.id,
    });
  },
};
