module.exports = {
  name: 'kick',
  description: 'Kick a member. Usage: kick <@user> [reason]',
  async execute(client, message, args) {
    if (!message.member.permissions.has('KickMembers')) return message.channel.send('You need Kick Members permission.');
    const target = message.mentions.members.first();
    if (!target) return message.channel.send('Mention a member to kick.');
    const reason = args.slice(1).join(' ') || 'No reason provided';
    try {
      await target.kick(reason);
      message.channel.send(`${target.user.tag} was kicked. Reason: ${reason}`);
    } catch (err) {
      console.error(err);
      message.channel.send('Failed to kick member.');
    }
  }
};
