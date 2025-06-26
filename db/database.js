const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// db フォルダ内に clockin.db を固定
const dbPath = path.resolve(__dirname, 'clockin.db');
const db = new sqlite3.Database(dbPath);

// 初回起動時のテーブル作成
db.serialize(() => {
  // サーバー設定（通知チャンネル・タイムカード設置チャンネル）
  db.run(`CREATE TABLE IF NOT EXISTS servers (
    guild_id TEXT PRIMARY KEY,
    role_id TEXT,
    channel_id TEXT,
    announce_channel_id TEXT
  )`);

  // 出勤ユーザーの状態と累計出勤時間（秒単位）
  db.run(`CREATE TABLE IF NOT EXISTS users (
    guild_id TEXT,
    user_id TEXT,
    clock_in_time INTEGER,
    total_seconds INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  )`);

  // 権限ロール管理テーブル
  db.run(`CREATE TABLE IF NOT EXISTS privileges (
    guild_id TEXT,
    role_id TEXT,
    PRIMARY KEY (guild_id, role_id)
  )`);

  // 出勤可能時間・アラート時間設定
  db.run(`CREATE TABLE IF NOT EXISTS alerts (
    guild_id TEXT PRIMARY KEY,
    start_hour INTEGER,
    start_minute INTEGER,
    end_hour INTEGER,
    end_minute INTEGER,
    alert_hour INTEGER,
    alert_minute INTEGER
  )`);

  // 出勤終了時にロールが残っていたユーザーを一時保存
  db.run(`CREATE TABLE IF NOT EXISTS pending_alerts (
    guild_id TEXT,
    user_id TEXT,
    timestamp INTEGER
  )`);

  console.log('✅ DB構築完了：全テーブル作成済みまたは既存');
});

module.exports = db;
