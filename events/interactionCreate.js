const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../db/database');
const { formatDuration, updateTimecardMessage, sendLogToAdminChannel } = require('../utils/helpers');
const { hasPermission } = require('../utils/permissions');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    const guildId = interaction.guild?.id;
    const userId = interaction.user?.id;
    const now = Math.floor(Date.now() / 1000);

    if (!guildId || !interaction.guild) return;

    // 出勤ボタン
    if (interaction.isButton() && interaction.customId === 'clockin') {
      const currentDate = new Date();
      const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();

      db.get(`SELECT start_hour, start_minute, end_hour, end_minute FROM alerts WHERE guild_id = ?`, [guildId], (err, alertRow) => {
        if (err) {
          console.error('⛔ 出勤時間取得エラー:', err);
          return interaction.reply({ content: '⚠️ 出勤時間の確認中にエラーが発生しました。', ephemeral: true });
        }

        if (!alertRow) {
          return interaction.reply({ content: '⚠️ 出勤時間が設定されていません。管理者に連絡してください。', ephemeral: true });
        }

        const start = alertRow.start_hour * 60 + alertRow.start_minute;
        const end = alertRow.end_hour * 60 + alertRow.end_minute;

        let withinWorkTime = false;
        if (start <= end) {
          // 同日内（例：09:00〜17:00）
          withinWorkTime = currentMinutes >= start && currentMinutes <= end;
        } else {
          // 翌日またぎ（例：15:00〜29:00など）
          withinWorkTime = currentMinutes >= start || currentMinutes <= (end - 1440);
        }

        if (!withinWorkTime) {
          return interaction.reply({
            content: `⏰ 出勤可能時間外です。\n出勤可能時間は **${alertRow.start_hour.toString().padStart(2, '0')}:${alertRow.start_minute.toString().padStart(2, '0')} ～ ${alertRow.end_hour.toString().padStart(2, '0')}:${alertRow.end_minute.toString().padStart(2, '0')}** です。`,
            ephemeral: true
          });
        }

        db.get(`SELECT clock_in_time FROM users WHERE guild_id = ? AND user_id = ?`, [guildId, userId], (err, row) => {
          if (err) return console.error(err);

          if (row?.clock_in_time) {
            return interaction.reply({ content: '🚨 すでに出勤中です。', ephemeral: true });
          }

          db.run(`INSERT INTO users (guild_id, user_id, clock_in_time)
                  VALUES (?, ?, ?)
                  ON CONFLICT(guild_id, user_id) DO UPDATE SET clock_in_time = excluded.clock_in_time`,
            [guildId, userId, now]);

          interaction.reply({ content: '✅ 出勤処理を行いました。', ephemeral: true });

          db.get(`SELECT role_id, announce_channel_id FROM servers WHERE guild_id = ?`, [guildId], async (err, serverRow) => {
            if (!err && serverRow?.role_id) {
              const member = await interaction.guild.members.fetch(userId);
              member.roles.add(serverRow.role_id).catch(console.error);
            }

            if (serverRow?.announce_channel_id) {
              const embed = new EmbedBuilder()
                .setTitle('✅ 出勤ログ')
                .setDescription(`<@${userId}> が出勤しました。`)
                .setColor(0x00BFFF)
                .setTimestamp();

              sendLogToAdminChannel(interaction.client, serverRow.announce_channel_id, embed);
            }
          });

          updateTimecardMessage(interaction.client, guildId, db);
        });
      });
    }

    // 退勤ボタン
    if (interaction.isButton() && interaction.customId === 'clockout') {
      db.get(`SELECT clock_in_time, total_seconds FROM users WHERE guild_id = ? AND user_id = ?`, [guildId, userId], (err, row) => {
        if (err) return console.error(err);

        if (!row?.clock_in_time) {
          return interaction.reply({ content: '🚫 出勤していません。', ephemeral: true });
        }

        const sessionSeconds = now - row.clock_in_time;
        const totalSeconds = (row.total_seconds || 0) + sessionSeconds;

        db.run(`UPDATE users SET clock_in_time = NULL, total_seconds = ? WHERE guild_id = ? AND user_id = ?`, [totalSeconds, guildId, userId]);

        interaction.reply({
          content: `🏁 退勤処理を行いました。\n🕒 今回の出勤時間：**${formatDuration(sessionSeconds)}**\n📊 累計出勤時間：**${formatDuration(totalSeconds)}**`,
          ephemeral: true
        });

        db.get(`SELECT role_id, announce_channel_id FROM servers WHERE guild_id = ?`, [guildId], async (err, serverRow) => {
          if (!err && serverRow?.role_id) {
            const member = await interaction.guild.members.fetch(userId);
            member.roles.remove(serverRow.role_id).catch(console.error);
          }

          if (serverRow?.announce_channel_id) {
            const embed = new EmbedBuilder()
              .setTitle('🏁 退勤ログ')
              .setDescription(`<@${userId}> が退勤しました。`)
              .addFields(
                { name: '今回の出勤時間', value: formatDuration(sessionSeconds), inline: true },
                { name: '累計出勤時間', value: formatDuration(totalSeconds), inline: true }
              )
              .setColor(0x808080)
              .setTimestamp();

            sendLogToAdminChannel(interaction.client, serverRow.announce_channel_id, embed);
          }
        });

        updateTimecardMessage(interaction.client, guildId, db);
      });
    }

    // 退勤ボタン
    if (interaction.isButton() && interaction.customId === 'clockout') {
      db.get(`SELECT clock_in_time, total_seconds FROM users WHERE guild_id = ? AND user_id = ?`, [guildId, userId], (err, row) => {
        if (err) return console.error(err);

        if (!row?.clock_in_time) {
          return interaction.reply({ content: '🚫 出勤していません。', ephemeral: true });
        }

        const sessionSeconds = now - row.clock_in_time;
        const totalSeconds = (row.total_seconds || 0) + sessionSeconds;

        db.run(`UPDATE users SET clock_in_time = NULL, total_seconds = ? WHERE guild_id = ? AND user_id = ?`, [totalSeconds, guildId, userId]);

        interaction.reply({
          content: `🏁 退勤処理を行いました。\n🕒 今回の出勤時間：**${formatDuration(sessionSeconds)}**\n📊 累計出勤時間：**${formatDuration(totalSeconds)}**`,
          ephemeral: true
        });

        db.get(`SELECT role_id, announce_channel_id FROM servers WHERE guild_id = ?`, [guildId], async (err, serverRow) => {
          if (!err && serverRow?.role_id) {
            const member = await interaction.guild.members.fetch(userId);
            member.roles.remove(serverRow.role_id).catch(console.error);
          }

          if (serverRow?.announce_channel_id) {
            const embed = new EmbedBuilder()
              .setTitle('🏁 退勤ログ')
              .setDescription(`<@${userId}> が退勤しました。`)
              .addFields(
                { name: '今回の出勤時間', value: formatDuration(sessionSeconds), inline: true },
                { name: '累計出勤時間', value: formatDuration(totalSeconds), inline: true }
              )
              .setColor(0x808080)
              .setTimestamp();

            sendLogToAdminChannel(interaction.client, serverRow.announce_channel_id, embed);
          }
        });

        updateTimecardMessage(interaction.client, guildId, db);
      });
    }

    // 労働時間集計
    if (interaction.isButton() && interaction.customId === 'summary_time') {
      const hasPerm = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || await hasPermission(interaction, db);
      if (!hasPerm) return interaction.reply({ content: '🚫 権限がありません。', ephemeral: true });

      db.all(`SELECT user_id, total_seconds FROM users WHERE guild_id = ?`, [guildId], async (err, rows) => {
        if (err) return interaction.reply({ content: '💥 集計に失敗しました。', ephemeral: true });

        const summary = rows.length > 0
          ? rows.map(r => `<@${r.user_id}>：${formatDuration(r.total_seconds || 0)}`).join('\n')
          : '📭 データがありません。';

        const embed = new EmbedBuilder()
          .setTitle('📊 労働時間集計')
          .setDescription(`${summary}\n\n👤 実行者：<@${interaction.user.id}>`)
          .setColor(0x00b894)
          .setTimestamp();

        db.get(`SELECT announce_channel_id FROM servers WHERE guild_id = ?`, [guildId], (err, row) => {
          if (!err && row?.announce_channel_id) {
            sendLogToAdminChannel(interaction.client, row.announce_channel_id, embed);
          }
        });

        interaction.reply({ content: '✅ 労働時間を集計しました（ログを確認してください）', ephemeral: true });
      });
    }

    // 労働時間リセット確認用ボタン
    if (interaction.isButton() && interaction.customId === 'reset_time') {
      const hasPerm = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || await hasPermission(interaction, db);
      if (!hasPerm) return interaction.reply({ content: '🚫 権限がありません。', ephemeral: true });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_reset_time')
          .setLabel('はい、リセットします')
          .setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({
        content: '⚠️ 本当に全ユーザーの出勤記録と労働時間をリセットしてよろしいですか？',
        components: [row],
        ephemeral: true
      });
    }

    // リセット確認ボタンが押されたとき
    if (interaction.isButton() && interaction.customId === 'confirm_reset_time') {
      const hasPerm = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || await hasPermission(interaction, db);
      if (!hasPerm) return interaction.reply({ content: '🚫 権限がありません。', ephemeral: true });

      db.run(`DELETE FROM users WHERE guild_id = ?`, [guildId], (err) => {
        if (err) return interaction.reply({ content: '💥 リセットに失敗しました。', ephemeral: true });

        const embed = new EmbedBuilder()
          .setTitle('♻️ 労働時間リセット')
          .setDescription('全ユーザーの出勤記録と労働時間をリセットしました。\n\n👤 実行者：<@' + interaction.user.id + '>')
          .setColor(0xd63031)
          .setTimestamp();

        db.get(`SELECT announce_channel_id FROM servers WHERE guild_id = ?`, [guildId], (err, row) => {
          if (!err && row?.announce_channel_id) {
            sendLogToAdminChannel(interaction.client, row.announce_channel_id, embed);
          }
        });

        interaction.update({ content: '✅ 労働時間をリセットしました。', components: [], ephemeral: true });
      });
    }


    // --- 労働時間調整（ユーザー選択） ---
    if (interaction.isButton() && interaction.customId === 'adjust_time') {
      console.log('🟡 adjust_time ボタンが押されました');
      const hasPerm = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || await hasPermission(interaction, db);
      if (!hasPerm) return interaction.reply({ content: '🚫 権限がありません。', ephemeral: true });

      const userSelect = new UserSelectMenuBuilder()
        .setCustomId('select_user_for_adjust')
        .setPlaceholder('労働時間を調整するユーザーを選択');

      const row = new ActionRowBuilder().addComponents(userSelect);
      await interaction.reply({ content: '👤 ユーザーを選択してください：', components: [row], ephemeral: true });
    }

    // --- ユーザー選択後：モーダル表示 ---
    if (interaction.isUserSelectMenu() && interaction.customId === 'select_user_for_adjust') {
      const targetUserId = interaction.values[0];
      console.log(`🟢 ユーザーが選択されました: ${targetUserId}`);

      const modal = new ModalBuilder().setCustomId(`adjust_modal_${targetUserId}`).setTitle('労働時間の調整');

      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('days').setLabel('日数 (例: 1)').setStyle(TextInputStyle.Short).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('hours').setLabel('時間 (例: 2)').setStyle(TextInputStyle.Short).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('minutes').setLabel('分数 (例: 30)').setStyle(TextInputStyle.Short).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('seconds').setLabel('秒数 (例: -10 で減算)').setStyle(TextInputStyle.Short).setRequired(false))
      );

      await interaction.showModal(modal);
    }

    // --- モーダル送信後：労働時間調整処理 ---
    if (interaction.isModalSubmit() && interaction.customId.startsWith('adjust_modal_')) {
      const targetUserId = interaction.customId.replace('adjust_modal_', '');
      console.log(`🔵 モーダルが送信されました。対象: ${targetUserId}`);

      const getVal = (id) => parseInt(interaction.fields.getTextInputValue(id) || '0', 10);
      const totalSeconds = (getVal('days') * 86400) + (getVal('hours') * 3600) + (getVal('minutes') * 60) + getVal('seconds');

      console.log(`🧮 合計秒数: ${totalSeconds}`);

      if (isNaN(totalSeconds) || totalSeconds === 0) {
        return interaction.reply({ content: '⚠️ 正しい時間を入力してください。', ephemeral: true });
      }

      db.get(`SELECT total_seconds FROM users WHERE guild_id = ? AND user_id = ?`, [guildId, targetUserId], (err, row) => {
        if (err) {
          console.error('💥 データ取得エラー:', err);
          return interaction.reply({ content: '💥 データ取得に失敗しました。', ephemeral: true });
        }

        const current = row?.total_seconds || 0;
        const updated = Math.max(current + totalSeconds, 0);

        console.log(`💾 現在: ${current} → 更新後: ${updated}`);

        db.run(
          `INSERT INTO users (guild_id, user_id, total_seconds, clock_in_time)
           VALUES (?, ?, ?, NULL)
           ON CONFLICT(guild_id, user_id) DO UPDATE SET total_seconds = ?, clock_in_time = NULL`,
          [guildId, targetUserId, updated, updated],
          (err) => {
            if (err) {
              console.error('💥 データ更新エラー:', err);
              return interaction.reply({ content: '💥 労働時間の更新に失敗しました。', ephemeral: true });
            }

            const embed = new EmbedBuilder()
              .setTitle('🛠 労働時間調整ログ')
              .setDescription(`<@${targetUserId}> の労働時間を ${totalSeconds} 秒調整しました。\n\n👤 実行者：<@${interaction.user.id}>`)
              .addFields({ name: '現在の累計労働時間', value: formatDuration(updated) })
              .setColor(0xf39c12)
              .setTimestamp();

            db.get(`SELECT announce_channel_id FROM servers WHERE guild_id = ?`, [guildId], (err, row) => {
              if (!err && row?.announce_channel_id) {
                sendLogToAdminChannel(interaction.client, row.announce_channel_id, embed);
              }
            });

            interaction.reply({ content: `✅ <@${targetUserId}> の労働時間を調整しました。`, ephemeral: true });
          }
        );
      });
    }
  }
};
