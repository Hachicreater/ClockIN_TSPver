const { EmbedBuilder } = require('discord.js');

module.exports = async function alertRunner(client, db) {
  const now = new Date();
  const nowHour = now.getHours();
  const nowMinute = now.getMinutes();
  const nowTotal = nowHour * 60 + nowMinute;

  db.all(`SELECT * FROM alerts`, async (err, alertRows) => {
    if (err) return console.error('❌ alerts テーブル取得失敗:', err);

    for (const alert of alertRows) {
      const {
        guild_id,
        start_hour, start_minute,
        end_hour, end_minute,
        alert_hour, alert_minute
      } = alert;

      if (nowHour !== alert_hour || nowMinute !== alert_minute) continue;

      const endTotal = end_hour * 60 + end_minute;
      const guild = client.guilds.cache.get(guild_id);
      if (!guild) continue;

      db.get(
        `SELECT role_id, announce_channel_id FROM servers WHERE guild_id = ?`,
        [guild_id],
        async (err2, serverRow) => {
          if (err2 || !serverRow) return;

          const role = guild.roles.cache.get(serverRow.role_id);
          const channel = guild.channels.cache.get(serverRow.announce_channel_id);
          if (!role || !channel) return;

          const members = role.members;
          const flagged = [];

          for (const [_, member] of members) {
            const userId = member.id;

            db.get(
              `SELECT clock_in_time FROM users WHERE guild_id = ? AND user_id = ?`,
              [guild_id, userId],
              (err3, row) => {
                if (err3) return;
                const stillClockedIn = row?.clock_in_time != null;

                // 前回の終了時間にロールがついていたが、その後リセットされてない場合
                if (!stillClockedIn) {
                  flagged.push(`<@${userId}>`);
                }
              }
            );
          }

          // 少し待ってから送信（全DBチェック完了の猶予）
          setTimeout(() => {
            if (flagged.length === 0) return;

            const embed = new EmbedBuilder()
              .setTitle('⚠️ シフト後の出勤ロール保持通知')
              .setDescription(
                `以下のメンバーは出勤時間（${end_hour}:${end_minute
                  .toString()
                  .padStart(2, '0')}）終了時点でロールが付いたままでした。`
              )
              .addFields({ name: '対象メンバー', value: flagged.join('\n') })
              .setColor(0xe67e22)
              .setTimestamp()
              .setFooter({ text: 'ClockIN 労働時間アラート' });

            channel.send({ embeds: [embed] });
          }, 1000);
        }
      );
    }
  });
};
