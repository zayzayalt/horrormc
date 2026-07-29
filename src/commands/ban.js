const ms = require('ms');
module.exports = {
  name: 'ban',
  description: 'Ban a member. Usage: ban <@user> [reason] [--deleteDays=N]',
  async execute(client, message, args) {
    if (!message.member.permissions.has('BanMembers')) return message.channel.send('You need Ban Members permission.');
    const target = message.mentions.members.first();
    if (!target) return message.channel.send('Mention a member to ban.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    try {
      await target.ban({ reason });
      message.channel.send(`${target.user.tag} was banned. Reason: ${reason}`);
    } catch (err) {
      console.error(err);
      message.channel.send('Failed to ban member.');
    }
  }
};
