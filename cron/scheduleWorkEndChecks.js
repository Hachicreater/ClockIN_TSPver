// cron/scheduleWorkEndChecks.js
const cron = require('node-cron');
const db = require('../database');
const workEndCheck = require('../utils/workEndCheck');

module.exports = function scheduleWorkEndChecks(client) {
  db.all(`SELECT * FROM alerts`, (err, rows) => {
    if (err) return console.error('❌ alerts テーブル取得失敗:', err);

    rows.forEach(row => {
      const { guild_id, end_hour, end_minute } = row;

      const hour = end_hour >= 24 ? end_hour - 24 : end_hour;
      const dayOffset = end_hour >= 24 ? 1 : 0;

      const cronTime = `${end_minute} ${hour} * * *`;

      cron.schedule(cronTime, () => {
        const now = new Date();
        const isToday = now.getDay() === ((new Date().getDay() + dayOffset) % 7);
        if (isToday) {
          console.log(`⏰ 実行：${guild_id} 向け 出勤終了ロールチェック`);
          workEndCheck(client);
        }
      });

      console.log(`📅 ${guild_id} の終了チェックを ${end_hour}:${end_minute} にスケジュールしました`);
    });
  });
};
