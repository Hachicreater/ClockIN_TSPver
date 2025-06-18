// helpers/permissions.js
const { PermissionFlagsBits } = require('discord.js');

/**
 * ユーザーが管理者権限または権限ロールを保持しているか確認します。
 * @param {CommandInteraction} interaction
 * @param {sqlite3.Database} db
 * @returns {Promise<boolean>}
 */
async function hasPermission(interaction, db) {
  // 管理者権限を持つ場合はOK
  if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  // データベースから権限ロール一覧を取得
  return new Promise((resolve) => {
    db.all(
      `SELECT role_id FROM privileges WHERE guild_id = ?`,
      [interaction.guild.id],
      (err, rows) => {
        if (err || !rows) return resolve(false);

        // ユーザーの保持ロールと照合
        const userRoles = interaction.member.roles.cache;
        const hasPrivilegedRole = rows.some(row => userRoles.has(row.role_id));
        resolve(hasPrivilegedRole);
      }
    );
  });
}

module.exports = { hasPermission };
