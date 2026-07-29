const db = require('../utils/db');
module.exports = {
  name: 'setprefix',
  description: 'Set the command prefix for this guild. Usage: setprefix <prefix>',
  async execute(client, message, args) {
    if (!message.member.permissions.has('ManageGuild')) return message.channel.send('You need Manage Server permission.');
    const prefix = args[0];
    if (!prefix) return message.channel.send('Provide a prefix.');
    db.prepare('INSERT INTO guild_settings (guild_id, prefix) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET prefix=excluded.prefix').run(message.guild.id, prefix);
    message.channel.send(`Prefix set to ${prefix}`);
  }
};
