import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, Interaction } from "discord.js";
import { BOT_COLOR, BOT_FOOTER, APP_URL, LOGO_URL } from "../config";
import { prisma } from "../index";

export const userinfoCommand = {
  name: "userinfo",
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;

    const target = cmd.options.getUser("user") || cmd.user;
    const member = cmd.guild?.members.cache.get(target.id) as GuildMember | undefined;

    const embed = new EmbedBuilder()
      .setColor(BOT_COLOR)
      .setTitle(`User Info — ${target.tag}`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "ID", value: `\`${target.id}\``, inline: true },
        { name: "Created", value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
      );

    if (member) {
      embed.addFields(
        { name: "Joined", value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : "Unknown", inline: true },
        { name: "Nickname", value: member.nickname || "None", inline: true },
        { name: "Boosting", value: member.premiumSince ? `Since <t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>` : "No", inline: true },
        { name: "Top Role", value: member.roles.highest.id !== cmd.guild?.id ? `${member.roles.highest}` : "None", inline: true },
        { name: "Roles", value: `${member.roles.cache.filter(r => r.id !== cmd.guild?.id).size}`, inline: true },
      );
    }

    // Check if they have a ToxicLinks account
    const dbUser = await prisma.user.findFirst({
      where: { accounts: { some: { provider: "discord", providerAccountId: target.id } } },
      select: { username: true, plan: true, profile: { select: { totalViews: true } } },
    });

    if (dbUser?.username) {
      embed.addFields({
        name: "🔗 ToxicLinks",
        value: `[@${dbUser.username}](${APP_URL}/${dbUser.username}) • ${dbUser.plan} • ${dbUser.profile?.totalViews || 0} views`,
      });
    }

    embed.setFooter({ text: BOT_FOOTER, iconURL: LOGO_URL }).setTimestamp();
    await cmd.reply({ embeds: [embed] });
  },
};
