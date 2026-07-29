const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join(process.cwd(), 'data', 'bot.sqlite');
const fs = require('fs');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(dbPath);

db.prepare(`CREATE TABLE IF NOT EXISTS warns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  user_id TEXT,
  moderator_id TEXT,
  reason TEXT,
  created_at INTEGER
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  channel_id TEXT,
  owner_id TEXT,
  status TEXT,
  created_at INTEGER
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  user_id TEXT,
  answers TEXT,
  status TEXT,
  created_at INTEGER
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  prefix TEXT,
  ai_channel_id TEXT,
  ai_personality TEXT,
  ai_enabled INTEGER DEFAULT 0
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS ai_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  channel_id TEXT,
  user_id TEXT,
  role TEXT,
  content TEXT,
  created_at INTEGER
)`).run();

module.exports = db;
