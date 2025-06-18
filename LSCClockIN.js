const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const db = require('./db/database');
const config = require('./config.json');
const alertRunner = require('./utils/alertRunner');
const { updateTimecardMessage } = require('./utils/helpers'); // 経過時間の更新を使う

(async () => {
  // スラッシュコマンド登録を待機してからBOT起動
  await require('./deploy-commands');

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.commands = new Collection();
  const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
  }

  client.once('ready', () => {
    console.log(`✅ ClockIN 起動完了 - ログインユーザー: ${client.user.tag}`);

    // ⏱️ 毎分 alertRunner を実行
    setInterval(() => {
      alertRunner(client, db);
    }, 60 * 1000);

    // ⏱️ 毎分 出勤パネル更新（経過時間表示）
    setInterval(() => {
      client.guilds.cache.forEach(guild => {
        updateTimecardMessage(client, guild.id, db);
      });
    }, 60 * 1000);
  });

  client.on('interactionCreate', async interaction => {
    // すべてのインタラクション（コマンド・ボタン・モーダル・セレクト）に対応
    if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) return command.execute(interaction, db);
    }

    const handler = require('./events/interactionCreate');
    handler.execute(interaction, db);
  });

  client.login(config.token);
})();
