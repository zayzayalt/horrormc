const db = require('../utils/db');

module.exports = {
  name: 'aichat',
  description: 'Manage AI chat: aichat setchannel <#channel|off> | aichat personality set|show <text>',
  async execute(client, message, args) {
    if (!message.member.permissions.has('ManageGuild')) return message.channel.send('You need Manage Server permission.');
    const sub = args[0];
    if (!sub) return message.channel.send('Usage: aichat setchannel <#channel|off> | aichat personality set <text> | aichat personality show');
    if (sub === 'setchannel') {
      const mention = args[1];
      if (!mention) return message.channel.send('Provide a channel mention, id, or "off".');
      if (mention.toLowerCase() === 'off') {
        db.prepare('INSERT INTO guild_settings (guild_id, ai_channel_id, ai_enabled) VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET ai_channel_id=excluded.ai_channel_id, ai_enabled=excluded.ai_enabled').run(message.guild.id, null, 0);
        return message.channel.send('AI channel disabled.');
      }
      // resolve
      const ch = message.mentions.channels.first() || message.guild.channels.cache.get(mention);
      if (!ch) return message.channel.send('Channel not found.');
      db.prepare('INSERT INTO guild_settings (guild_id, ai_channel_id, ai_enabled) VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET ai_channel_id=excluded.ai_channel_id, ai_enabled=excluded.ai_enabled').run(message.guild.id, ch.id, 1);
      return message.channel.send(`AI channel set to ${ch}`);
    }
    if (sub === 'personality') {
      const action = args[1];
      if (!action) return message.channel.send('Usage: aichat personality set <text> | aichat personality show');
      if (action === 'set') {
        const text = args.slice(2).join(' ');
        if (!text) return message.channel.send('Provide personality text.');
        db.prepare('INSERT INTO guild_settings (guild_id, ai_personality) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET ai_personality=excluded.ai_personality').run(message.guild.id, text);
        return message.channel.send('AI personality saved.');
      }
      if (action === 'show') {
        const row = db.prepare('SELECT ai_personality FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
        return message.channel.send(row && row.ai_personality ? `Personality: ${row.ai_personality}` : 'No personality set.');
      }
    }
    return message.channel.send('Unknown subcommand.');
  }
};
