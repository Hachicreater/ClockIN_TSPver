const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { hasPermission } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setworktime')
    .setDescription('出勤可能時間を設定します')
    .addIntegerOption(option =>
      option.setName('start_hour')
        .setDescription('出勤開始時（0～29）')
        .setMinValue(0).setMaxValue(29)
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('start_minute')
        .setDescription('出勤開始分（0～59）')
        .setMinValue(0).setMaxValue(59)
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('end_hour')
        .setDescription('出勤終了時（0～29）')
        .setMinValue(0).setMaxValue(29)
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('end_minute')
        .setDescription('出勤終了分（0～59）')
        .setMinValue(0).setMaxValue(59)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // 管理者にのみ候補表示

  async execute(interaction, db) {
    // 管理者 or 権限ロールチェック
    if (!(await hasPermission(interaction, db))) {
      return interaction.reply({
        content: '🚫 このコマンドを使用するには管理者権限または権限ロールが必要です。',
        ephemeral: true
      });
    }

    const guildId = interaction.guild.id;
    const startHour = interaction.options.getInteger('start_hour');
    const startMinute = interaction.options.getInteger('start_minute');
    const endHour = interaction.options.getInteger('end_hour');
    const endMinute = interaction.options.getInteger('end_minute');

    db.run(`
      INSERT INTO alerts (guild_id, start_hour, start_minute, end_hour, end_minute)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guild_id)
      DO UPDATE SET start_hour = excluded.start_hour, start_minute = excluded.start_minute,
                    end_hour = excluded.end_hour, end_minute = excluded.end_minute
    `, [guildId, startHour, startMinute, endHour, endMinute], (err) => {
      if (err) {
        console.error('❌ 出勤時間保存エラー:', err);
        return interaction.reply({ content: '💥 出勤時間の設定に失敗しました。', ephemeral: true });
      }

      interaction.reply({
        content: `🕒 出勤可能時間を **${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')} ～ ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}** に設定しました。`,
        ephemeral: true
      });
    });
  }
};
