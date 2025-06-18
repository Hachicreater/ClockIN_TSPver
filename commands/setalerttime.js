const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { hasPermission } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setalerttime')
    .setDescription('時間外ロール保持者を通知するアラート時刻を設定します')
    .addIntegerOption(option =>
      option.setName('hour')
        .setDescription('通知時刻の「時」 (0〜29時対応)')
        .setMinValue(0).setMaxValue(29)
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('minute')
        .setDescription('通知時刻の「分」 (0〜59分)')
        .setMinValue(0).setMaxValue(59)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // 候補表示は管理者のみ

  async execute(interaction, db) {
    if (!(await hasPermission(interaction, db))) {
      return interaction.reply({
        content: '🚫 このコマンドを使用するには管理者権限または権限ロールが必要です。',
        ephemeral: true
      });
    }

    const guildId = interaction.guild.id;
    const hour = interaction.options.getInteger('hour');
    const minute = interaction.options.getInteger('minute');

    db.run(`
      UPDATE alerts
      SET alert_hour = ?, alert_minute = ?
      WHERE guild_id = ?
    `, [hour, minute, guildId], function (err) {
      if (err) {
        console.error('❌ アラート時間設定エラー:', err);
        return interaction.reply({ content: '💥 アラート時間の設定に失敗しました。', ephemeral: true });
      }

      // guild_id が存在しなかった場合は INSERT
      if (this.changes === 0) {
        db.run(`
          INSERT INTO alerts (guild_id, alert_hour, alert_minute)
          VALUES (?, ?, ?)
        `, [guildId, hour, minute]);
      }

      interaction.reply({
        content: `⏰ アラート通知時間を **${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}** に設定しました。`,
        ephemeral: true
      });
    });
  }
};
