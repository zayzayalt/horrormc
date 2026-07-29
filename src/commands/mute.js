module.exports = {
  name: 'mute',
  description: 'Mute a member by adding a Muted role. Usage: mute <@user> [reason]',
  async execute(client, message, args) {
    if (!message.member.permissions.has('ManageRoles')) return message.channel.send('You need Manage Roles permission.');
    const target = message.mentions.members.first();
    if (!target) return message.channel.send('Mention a member to mute.');
    let mutedRole = message.guild.roles.cache.find(r => r.name === 'Muted');
    if (!mutedRole) {
      try {
        mutedRole = await message.guild.roles.create({ name: 'Muted', reason: 'Create muted role' });
        for (const channel of message.guild.channels.cache.values()) {
          try {
            await channel.permissionOverwrites.edit(mutedRole, { SendMessages: false, AddReactions: false, Speak: false });
          } catch(e){}
        }
      } catch (err) {
        console.error(err);
        return message.channel.send('Failed to create Muted role.');
      }
    }
    try {
      await target.roles.add(mutedRole, `Muted by ${message.author.tag}`);
      message.channel.send(`${target.user.tag} has been muted.`);
    } catch (err) {
      console.error(err);
      message.channel.send('Failed to mute.');
    }
  }
};
