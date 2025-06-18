const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrole')
    .setDescription('特定の権限ロールを追加、削除、または一覧表示します（管理者限定）')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('権限ロールを追加')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('追加するロール')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('権限ロールを削除')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('削除するロール')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('現在の権限ロール一覧を表示'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, db) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '🚫 このコマンドを使用するには管理者権限が必要です。',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === 'add') {
      const role = interaction.options.getRole('role');
      db.run(
        `INSERT OR IGNORE INTO privileges (guild_id, role_id) VALUES (?, ?)`,
        [guildId, role.id],
        (err) => {
          if (err) {
            console.error(err);
            return interaction.reply({ content: '💥 ロール追加に失敗しました。', ephemeral: true });
          }
          interaction.reply({ content: `✅ ロール <@&${role.id}> を権限ロールに追加しました。`, ephemeral: true });
        }
      );
    } else if (subcommand === 'delete') {
      const role = interaction.options.getRole('role');
      db.run(
        `DELETE FROM privileges WHERE guild_id = ? AND role_id = ?`,
        [guildId, role.id],
        (err) => {
          if (err) {
            console.error(err);
            return interaction.reply({ content: '💥 ロール削除に失敗しました。', ephemeral: true });
          }
          interaction.reply({ content: `🗑️ ロール <@&${role.id}> を権限ロールから削除しました。`, ephemeral: true });
        }
      );
    } else if (subcommand === 'list') {
      db.all(`SELECT role_id FROM privileges WHERE guild_id = ?`, [guildId], async (err, rows) => {
        if (err) {
          console.error(err);
          return interaction.reply({ content: '💥 ロール一覧取得に失敗しました。', ephemeral: true });
        }

        if (rows.length === 0) {
          return interaction.reply({ content: '📭 現在、権限ロールは登録されていません。', ephemeral: true });
        }

        const roleMentions = rows.map(row => `<@&${row.role_id}>`).join('\n');
        return interaction.reply({
          content: `📝 登録されている権限ロール一覧:\n${roleMentions}`,
          ephemeral: true
        });
      });
    }
  }
};
