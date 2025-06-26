const cron = require('node-cron');
const workEndCheck = require('../utils/workEndCheck');

const tasks = new Map(); // key: guild_id, value: cron task

function scheduleWorkEndCheck(client, guildId, endHour, endMinute) {
  // 一度登録済みのスケジュールを解除
  if (tasks.has(guildId)) {
    tasks.get(guildId).stop();
    tasks.delete(guildId);
  }

  // 時間調整（24時以降は翌日扱い → cronは0〜23のみ対応）
  const hour = endHour >= 24 ? endHour - 24 : endHour;
  const cronTime = `${endMinute} ${hour} * * *`;

  const task = cron.schedule(cronTime, () => {
    console.log(`⏰ 実行：${guildId} 向け 出勤終了ロールチェック`);
    workEndCheck(client, guildId); 
  });

  tasks.set(guildId, task);
  console.log(`📅 スケジュール登録: ${guildId} → ${endHour}:${endMinute}`);
}

module.exports = { scheduleWorkEndCheck };
