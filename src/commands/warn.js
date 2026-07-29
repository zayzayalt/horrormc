const db = require('../utils/db');
module.exports = {
  name: 'warn',
  description: 'Warn a user. Usage: warn <@user> [reason]',
  async execute(client, message, args) {
    if (!message.member.permissions.has('ManageMessages') && !message.member.permissions.has('KickMembers')) return message.channel.send('You need moderator permissions.');
    const target = message.mentions.users.first();
    if (!target) return message.channel.send('Mention a user to warn.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    const stmt = db.prepare('INSERT INTO warns (guild_id, user_id, moderator_id, reason, created_at) VALUES (?, ?, ?, ?, ?)');
    stmt.run(message.guild.id, target.id, message.author.id, reason, Date.now());
    message.channel.send(`${target.tag} has been warned. Reason: ${reason}`);
    try { await target.send(`You were warned in ${message.guild.name}. Reason: ${reason}`); } catch(e){}
  }
};
