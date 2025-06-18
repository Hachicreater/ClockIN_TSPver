const { EmbedBuilder } = require('discord.js');

// 秒数を「〇日〇時間〇分〇秒」形式に変換
function formatDuration(seconds) {
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const parts = [];
  if (days > 0) parts.push(`${days}日`);
  if (hours > 0) parts.push(`${hours}時間`);
  if (minutes > 0) parts.push(`${minutes}分`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}秒`);

  return parts.join('');
}

// 出勤中ユーザーを更新（経過時間付き）
async function updateTimecardMessage(client, guildId, db) {
  db.get(`SELECT channel_id FROM servers WHERE guild_id = ?`, [guildId], async (err, row) => {
    if (err || !row) return;

    const channel = await client.channels.fetch(row.channel_id).catch(() => null);
    if (!channel) return;

    db.all(`SELECT user_id, clock_in_time FROM users WHERE guild_id = ? AND clock_in_time IS NOT NULL`, [guildId], async (err, rows) => {
      if (err) return;

      const now = Math.floor(Date.now() / 1000);
      const mentions = rows.length > 0
        ? rows.map(({ user_id, clock_in_time }) => {
            const elapsed = now - clock_in_time;
            return `<@${user_id}>（${formatDuration(elapsed)}）`;
          }).join('\n')
        : '現在出勤中のユーザーはいません。';

      const messages = await channel.messages.fetch({ limit: 10 });
      const targetMessage = messages.find(
        msg =>
          msg.author.id === client.user.id &&
          msg.embeds.length > 0 &&
          msg.embeds[0].title === '🕒 出退勤管理パネル'
      );

      if (!targetMessage) return;

      const embed = targetMessage.embeds[0];
      const updatedEmbed = EmbedBuilder.from(embed)
        .setFields([{ name: '🟢 出勤中のユーザー', value: mentions }]);

      targetMessage.edit({ embeds: [updatedEmbed], components: targetMessage.components });
    });
  });
}

// 管理ログ送信用
async function sendLogToAdminChannel(client, channelId, embed) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('📛 ログチャンネル送信エラー:', err);
  }
}

module.exports = {
  formatDuration,
  updateTimecardMessage,
  sendLogToAdminChannel
};
