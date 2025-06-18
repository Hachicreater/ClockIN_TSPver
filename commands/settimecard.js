const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const { hasPermission } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settimecard')
    .setDescription('出退勤ボタンを送信するチャンネルを設定し、メッセージを送信します')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('出退勤ボタンを表示するチャンネル')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('出勤中に付与するロール')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // 候補表示は管理者のみ

  async execute(interaction, db) {
    // 実行権限チェック
    if (!(await hasPermission(interaction, db))) {
      return interaction.reply({
        content: '🚫 このコマンドを使用するには管理者権限または権限ロールが必要です。',
        ephemeral: true
      });
    }

    const guildId = interaction.guild.id;
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');

    if (channel.type !== 0) {
      return interaction.reply({ content: '💡 テキストチャンネルを指定してください。', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🕒 出退勤管理パネル')
      .setDescription('以下のボタンで出勤または退勤を記録してください。')
      .setColor(0x00BFFF)
      .setFooter({ text: 'ClockIN Bot 出勤管理システム' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('clockin')
          .setLabel('✅ 出勤')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('clockout')
          .setLabel('💤 退勤')
          .setStyle(ButtonStyle.Danger),
      );

    await channel.send({ embeds: [embed], components: [row] });

    db.run(
      `INSERT INTO servers (guild_id, channel_id, role_id)
       VALUES (?, ?, ?)
       ON CONFLICT(guild_id)
       DO UPDATE SET channel_id = excluded.channel_id, role_id = excluded.role_id`,
      [guildId, channel.id, role.id],
      (err) => {
        if (err) {
          console.error('❌ timecardエラー:', err);
          return interaction.reply({ content: '💥 チャンネル設定に失敗しました。', ephemeral: true });
        }

        interaction.reply({
          content: `📋 出退勤ボタン付きメッセージを <#${channel.id}> に送信し、出勤ロールを <@&${role.id}> に設定しました。`,
          ephemeral: true
        });
      }
    );
  }
};
