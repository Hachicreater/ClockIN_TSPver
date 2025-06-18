const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config.json');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log('📤 グローバルスラッシュコマンド登録中...');

    const data = await rest.put(
      Routes.applicationCommands(config.clientId), // ← グローバル登録に変更
      { body: commands },
    );

    console.log(`✅ ${data.length} 個のスラッシュコマンドをグローバル登録しました:`);
    data.forEach(cmd => console.log(`- /${cmd.name}`));
  } catch (error) {
    console.error('❌ コマンド登録失敗:', error);
  }
})();

