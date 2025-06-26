const { EmbedBuilder } = require('discord.js');

module.exports = async function alertRunner(client, db) {
  const now = new Date();
  const nowHour = now.getHours();
  const nowMinute = now.getMinutes();

  db.all(`SELECT * FROM alerts`, async (err, alertRows) => {
    if (err) return console.error('❌ alerts テーブル取得失敗:', err);

    for (const alert of alertRows) {
      const {
        guild_id,
        alert_hour,
        alert_minute,
        end_hour,
        end_minute
      } = alert;

      if (nowHour !== alert_hour || nowMinute !== alert_minute) continue;

      console.log(`🔔 [${guild_id}] 通知時間到達！アラートを実行します`);

      const guild = client.guilds.cache.get(guild_id);
      if (!guild) continue;

      db.get(
        `SELECT announce_channel_id FROM servers WHERE guild_id = ?`,
        [guild_id],
        async (err2, serverRow) => {
          if (err2 || !serverRow) return;
          const channel = guild.channels.cache.get(serverRow.announce_channel_id);
          if (!channel) return;

          db.all(
            `SELECT user_id FROM pending_alerts WHERE guild_id = ?`,
            [guild_id],
            async (err3, rows) => {
              if (err3 || !rows || rows.length === 0) {
                console.log(`✅ 通知不要：pending_alerts に記録なし`);
                return;
              }

              const mentions = rows.map(r => `<@${r.user_id}>`);

              // ⚠️ Discord Embed 文字数制限対策（chunk化）
              const chunkedMentions = [];
              let currentChunk = '';

              for (const mention of mentions) {
                if ((currentChunk + '\n' + mention).length > 1000) {
                  chunkedMentions.push(currentChunk);
                  currentChunk = mention;
                } else {
                  currentChunk += (currentChunk ? '\n' : '') + mention;
                }
              }
              if (currentChunk) chunkedMentions.push(currentChunk);

              const embed = new EmbedBuilder()
                .setTitle('⚠️ シフト後の出勤ロール保持通知')
                .setDescription(`以下のメンバーは出勤時間（${end_hour}:${end_minute.toString().padStart(2, '0')}）終了時点でロールが付いたままでした。\n※この通知はその時点の記録に基づいています。`)
                .setColor(0xe67e22)
                .setTimestamp()
                .setFooter({ text: 'ClockIN 労働時間アラート' });

              chunkedMentions.forEach((chunk, i) => {
                embed.addFields({ name: i === 0 ? '対象メンバー' : '　', value: chunk });
              });

              await channel.send({ embeds: [embed] });
              console.log(`📢 アラート通知送信完了（${mentions.length}名）`);

              // 通知後に削除
              db.run(`DELETE FROM pending_alerts WHERE guild_id = ?`, [guild_id]);
            }
          );
        }
      );
    }
  });
};
