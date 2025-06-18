const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { hasPermission } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('ログ通知チャンネルを設定します')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('BOTのログを通知するチャンネル')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // 候補表示は管理者のみ

  async execute(interaction, db) {
    // 権限チェック（管理者 or 権限ロール）
    if (!(await hasPermission(interaction, db))) {
      return interaction.reply({
        content: '🚫 このコマンドを使用するには管理者権限または権限ロールが必要です。',
        ephemeral: true
      });
    }

    const guildId = interaction.guild.id;
    const channel = interaction.options.getChannel('channel');

    // テキストチャンネルか確認
    if (channel.type !== 0) {
      return interaction.reply({
        content: '💡 テキストチャンネルを指定してください。',
        ephemeral: true
      });
    }

    // announce_channel_id を servers テーブルに保存
    db.run(
      `UPDATE servers SET announce_channel_id = ? WHERE guild_id = ?`,
      [channel.id, guildId],
      function (err) {
        if (err) {
          console.error('❌ チャンネル設定エラー:', err);
          return interaction.reply({ content: '💥 チャンネル設定に失敗しました。', ephemeral: true });
        }

        // guild_id が存在しない場合はINSERT
        if (this.changes === 0) {
          db.run(
            `INSERT INTO servers (guild_id, announce_channel_id) VALUES (?, ?)`,
            [guildId, channel.id],
            (insertErr) => {
              if (insertErr) {
                console.error('❌ チャンネル初回登録エラー:', insertErr);
                return interaction.reply({ content: '💥 チャンネル設定に失敗しました。', ephemeral: true });
              }

              return interaction.reply({
                content: `📢 通知チャンネルを <#${channel.id}> に設定しました。`,
                ephemeral: true
              });
            }
          );
        } else {
          return interaction.reply({
            content: `📢 通知チャンネルを <#${channel.id}> に更新しました。`,
            ephemeral: true
          });
        }
      }
    );
  }
};
