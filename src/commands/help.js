const { EmbedBuilder } = require('discord.js');
const db = require('../utils/db');

module.exports = {
  name: 'help',
  description: 'Show available commands or details for a command. Usage: help [command]',
  async execute(client, message, args) {
    const target = args[0];
    // fetch guild prefix
    let prefix = '.';
    try {
      const row = db.prepare('SELECT prefix FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
      if (row && row.prefix) prefix = row.prefix;
    } catch (e) {}

    if (target) {
      const cmd = client.commands.get(target.toLowerCase());
      if (!cmd) return message.channel.send('No such command.');
      const embed = new EmbedBuilder()
        .setTitle(`Command: ${cmd.name}`)
        .setColor(0x5865F2)
        .addFields(
          { name: 'Description', value: cmd.description || 'No description.' },
          { name: 'Usage', value: cmd.usage || `${prefix}${cmd.name}` }
        )
        .setFooter({ text: `Prefix: ${prefix}` });
      return message.channel.send({ embeds: [embed] });
    }

    // Build a single embed containing the command list (description field)
    const lines = [];
    client.commands.forEach(c => {
      lines.push(`**${prefix}${c.name}** — ${c.description || 'No description.'}`);
    });
    const desc = lines.join('\n');
    const embed = new EmbedBuilder()
      .setTitle('Help — Command List')
      .setColor(0x5865F2)
      .setDescription(desc.length > 4090 ? desc.slice(0, 4087) + '...' : desc)
      .setFooter({ text: `Prefix: ${prefix}` });
    // send as a single message (DM if requested by author preference)
    try {
      await message.channel.send({ embeds: [embed] });
    } catch (e) {
      // fallback to DM
      try { await message.author.send({ embeds: [embed] }); } catch (err) { message.channel.send('Unable to send help embed.'); }
    }
    return null;
  }
};
