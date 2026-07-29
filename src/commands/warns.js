const db = require('../utils/db');
module.exports = {
  name: 'warns',
  description: 'List warns for a user. Usage: warns <@user>',
  async execute(client, message, args) {
    if (!message.member.permissions.has('ManageMessages') && !message.member.permissions.has('KickMembers')) return message.channel.send('You need moderator permissions.');
    const target = message.mentions.users.first();
    if (!target) return message.channel.send('Mention a user.');
    const rows = db.prepare('SELECT id, moderator_id, reason, created_at FROM warns WHERE guild_id = ? AND user_id = ?').all(message.guild.id, target.id);
    if (!rows.length) return message.channel.send('No warns for that user.');
    const lines = rows.map(r => `ID:${r.id} by <@${r.moderator_id}> - ${r.reason} (${new Date(r.created_at).toLocaleString()})`);
    message.channel.send(lines.join('\n'));
  }
};
