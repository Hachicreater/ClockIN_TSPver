const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');
const { hasPermission } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setadminpanel')
    .setDescription('管理用パネル（労働時間操作ボタン）を表示します')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('パネルを送信するテキストチャンネル')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // 候補表示は管理者のみ

  async execute(interaction, db) {
    if (!(await hasPermission(interaction, db))) {
      return interaction.reply({
        content: '🚫 このコマンドを使用するには管理者権限または権限ロールが必要です。',
        ephemeral: true
      });
    }

    const channel = interaction.options.getChannel('channel');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('adjust_time')
          .setLabel('🔧 労働時間調整')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('summary_time')
          .setLabel('📊 労働時間集計')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('reset_time')
          .setLabel('♻️ 労働時間リセット')
          .setStyle(ButtonStyle.Danger)
      );

    await channel.send({
      content: '🛠 管理者専用パネル\n※これらの操作は管理者または権限ロールのみが利用可能です。',
      components: [row]
    });

    interaction.reply({
      content: `✅ 管理パネルを <#${channel.id}> に送信しました。`,
      ephemeral: true
    });
  }
};
