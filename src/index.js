const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require('discord.js');
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

const logChannelId = process.env.MOD_LOG_CHANNEL_ID;
const consoleBuffer = [];
const maxBufferSize = 20;

function pushConsoleLog(entry) {
  consoleBuffer.push(entry);
  if (consoleBuffer.length > maxBufferSize) consoleBuffer.shift();
}

client.log = async (content) => {
  if (typeof content === 'string') {
    console.log(content);
  } else if (content && typeof content === 'object') {
    const title = content.title || 'Bot Log';
    const description = content.description || '';
    console.log(`[${title}] ${description}`);
  }
  if (!logChannelId) return;
  try {
    let channel = client.channels.cache.get(logChannelId);
    if (!channel) channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    if (typeof content === 'string') {
      await channel.send(content).catch(() => {});
      return;
    }

    const embed = content.embed || new EmbedBuilder()
      .setTitle(content.title || 'Bot Log')
      .setDescription(content.description || '')
      .setColor(content.color ?? 0x5865f2)
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error('Failed to log to configured channel', err);
  }
};

client.logEvent = async (title, description, color = 0x5865f2) => {
  await client.log({ title, description, color });
};

aiUtil.setLogger(async (title, description, color = 0x9b59b6) => {
  await client.logEvent(title, description, color);
});

client.logAIEvent = async (title, description, color = 0x9b59b6) => {
  await client.logEvent(title, description, color);
};

client.logFailure = async (title, description, color = 0xff5555) => {
  await client.logEvent(title, description, color);
};

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  const message = args.join(' ');
  originalConsoleLog.apply(console, args);
};

console.error = (...args) => {
  const message = args.join(' ');
  originalConsoleError.apply(console, args);
  if (logChannelId) {
    client.logEvent('Bot error', message, 0xff5555).catch(() => {});
  }
};

console.warn = (...args) => {
  const message = args.join(' ');
  originalConsoleWarn.apply(console, args);
  if (logChannelId) {
    client.logEvent('Bot warning', message, 0xffaa00).catch(() => {});
  }
};

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
    await client.logAIEvent('Command used', `${message.author.tag} used .${cmdName}`, 0x3498db);
  } catch (err) {
    console.error('Command error', err);
    await client.logFailure('Command failure', `Command .${cmdName} failed for ${message.author.tag}: ${err.message || err}`, 0xff5555);
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
      await client.logAIEvent('AI request', `${message.author.tag} triggered AI in #${message.channel.name || message.channel.id}`, 0x9b59b6);
      await message.channel.sendTyping();
      await new Promise(resolve => setTimeout(resolve, 2200));
      const combined = await aiUtil.queryAIWithHistory({ guildId: message.guild.id, channelId: message.channel.id, userId: message.author.id, username: message.author.username, content: message.content, personality });
      if (!combined) {
        await client.logFailure('AI no response', `AI returned no response for ${message.author.tag} in ${message.channel.id}`, 0xffaa00);
        return;
      }
      await message.reply({ content: combined, allowedMentions: { repliedUser: false, parse: [] } });
      await client.logAIEvent('AI response', `AI answered ${message.author.tag} successfully`, 0x2ecc71);
    } catch (e) {
      console.error('AI handler error', e);
      await client.logFailure('AI failure', `AI handler failed for ${message.author.tag}: ${e.message || e}`, 0xff5555);
    }
  } catch (e) {
    console.error('AI handler error', e);
    await client.logFailure('AI backend failure', `AI backend setup failed: ${e.message || e}`, 0xff5555);
  }
});

client.once('ready', async () => {
  const message = `Logged in as ${client.user.tag}`;
  console.log(message);
  await client.logEvent('Bot started', message, 0x2ecc71);
});

const handleShutdown = async (signal) => {
  try {
    await client.logEvent('Bot stopping', `Received ${signal}. Shutting down.`, 0xff5555);
  } catch (err) {
    console.error('Failed to log shutdown', err);
  }
  process.exit(0);
};

process.on('SIGINT', () => { handleShutdown('SIGINT'); });
process.on('SIGTERM', () => { handleShutdown('SIGTERM'); });
process.on('SIGUSR2', () => { handleShutdown('SIGUSR2'); });

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN in env');
  process.exit(1);
}
client.login(token);
