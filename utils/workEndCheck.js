const db = require('../db/database');

module.exports = async function workEndCheck(client, targetGuildId = null) {
  const now = Math.floor(Date.now() / 1000);

  db.all(`SELECT * FROM alerts`, async (err, alertRows) => {
    if (err) return console.error('❌ alerts テーブル取得失敗:', err);

    for (const alert of alertRows) {
      const { guild_id } = alert;

      // 特定サーバーのみ処理（引数で指定された場合）
      if (targetGuildId && guild_id !== targetGuildId) continue;

      const guild = client.guilds.cache.get(guild_id);
      if (!guild) {
        console.warn(`⚠️ Guild ${guild_id} が見つかりません`);
        continue;
      }

      db.get(
        `SELECT role_id FROM servers WHERE guild_id = ?`,
        [guild_id],
        async (err2, serverRow) => {
          if (err2 || !serverRow) return;

          const role = guild.roles.cache.get(serverRow.role_id);
          if (!role) {
            console.warn(`⚠️ ロールが見つかりません（Guild: ${guild_id}）`);
            return;
          }

          const members = role.members;

          for (const [_, member] of members) {
            const userId = member.id;

            db.get(
              `SELECT clock_in_time FROM users WHERE guild_id = ? AND user_id = ?`,
              [guild_id, userId],
              (err3, row) => {
                if (err3) return;

                const isClockedIn = row?.clock_in_time != null;

                if (!isClockedIn) {
                  db.run(
                    `INSERT INTO pending_alerts (guild_id, user_id, timestamp) VALUES (?, ?, ?)`,
                    [guild_id, userId, now]
                  );
                  console.log(`📌 pending_alerts に記録: ${guild_id} - ${userId}`);
                }
              }
            );
          }
        }
      );
    }
  });
};
