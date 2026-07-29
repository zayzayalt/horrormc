const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
require('dotenv').config();

const DEFAULT_PREFIX = process.env.PREFIX || '.';
const db = require('./utils/db');
const aiUtil = require('./utils/ai');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

// load commands
const commandsPath = path.join(__dirname, 'commands');
function loadCommands(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) loadCommands(full);
    else if (entry.isFile() && entry.name.endsWith('.js')) {
      const cmd = require(full);
      if (cmd && cmd.name) client.commands.set(cmd.name, cmd);
    }
  }
}
loadCommands(commandsPath);

// load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  for (const file of fs.readdirSync(eventsPath)) {
    if (!file.endsWith('.js')) continue;
    const event = require(path.join(eventsPath, file));
    if (event && event.name && event.execute) {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return; // ignore DMs for prefix commands
  // fetch guild prefix (fallback to default)
  const row = db.prepare('SELECT prefix FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
  const prefix = row && row.prefix ? row.prefix : DEFAULT_PREFIX;
  if (!message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const cmdName = args.shift().toLowerCase();
  const cmd = client.commands.get(cmdName);
  if (!cmd) return;
  try {
    await cmd.execute(client, message, args);
  } catch (err) {
    console.error('Command error', err);
    message.channel.send('There was an error executing that command.');
  }
});

// AI: listen for messages in configured AI channel and respond
client.on('messageCreate', async (message) => {
  try {
    if (!message.guild || message.author.bot) return;
    const settings = db.prepare('SELECT ai_channel_id, ai_personality, ai_enabled FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
    if (!settings || !settings.ai_enabled || !settings.ai_channel_id) return;
    if (message.channel.id !== settings.ai_channel_id) return;
    // skip if this message looks like a command (starts with guild prefix)
    const pRow = db.prepare('SELECT prefix FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
    const guildPrefix = pRow && pRow.prefix ? pRow.prefix : DEFAULT_PREFIX;
    if (message.content.startsWith(guildPrefix)) return;
    // send to AI and reply (short + long), show typing
    const personality = settings.ai_personality || 'You are a helpful assistant.';
    try {
      await message.channel.sendTyping();
      await new Promise(resolve => setTimeout(resolve, 2200));
      const combined = await aiUtil.queryAIWithHistory({ guildId: message.guild.id, channelId: message.channel.id, userId: message.author.id, username: message.author.username, content: message.content, personality });
      if (!combined) return;
      await message.reply({ content: combined, allowedMentions: { repliedUser: false, parse: [] } });
    } catch (e) { console.error('AI handler error', e); }
  } catch (e) { console.error('AI handler error', e); }
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN in env');
  process.exit(1);
}
client.login(token);
