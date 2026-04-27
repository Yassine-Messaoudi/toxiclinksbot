import { ChatInputCommandInteraction, EmbedBuilder, Interaction } from "discord.js";
import { BOT_COLOR, BOT_FOOTER, LOGO_URL } from "../config";

export const serverinfoCommand = {
  name: "serverinfo",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    const guild = cmd.guild;
    if (!guild) { await cmd.reply({ content: "This command can only be used in a server.", ephemeral: true }); return; }

    await guild.members.fetch().catch(() => {});

    const online = guild.members.cache.filter(m => m.presence?.status === "online" || m.presence?.status === "idle" || m.presence?.status === "dnd").size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = guild.memberCount - bots;
    const boosts = guild.premiumSubscriptionCount || 0;
    const channels = guild.channels.cache;
    const textChannels = channels.filter(c => c.isTextBased() && !c.isVoiceBased()).size;
    const voiceChannels = channels.filter(c => c.isVoiceBased()).size;
    const roles = guild.roles.cache.size - 1;

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }) || "")
      .addFields(
        { name: "👥 Members", value: `**${guild.memberCount.toLocaleString()}** total\n${humans.toLocaleString()} humans • ${bots} bots\n${online.toLocaleString()} online`, inline: true },
        { name: "💬 Channels", value: `${textChannels} text • ${voiceChannels} voice\n${channels.size} total`, inline: true },
        { name: "🎭 Roles", value: `${roles}`, inline: true },
        { name: "🚀 Boosts", value: `**${boosts}** (Level ${guild.premiumTier})`, inline: true },
        { name: "👑 Owner", value: `<@${guild.ownerId}>`, inline: true },
        { name: "📅 Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: `ID: ${guild.id} \u2022 ${BOT_FOOTER}`, iconURL: LOGO_URL })
      .setTimestamp();

    if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 1024 })!);

    await cmd.reply({ embeds: [embed] });
  },
};
