module.exports = {
  name: 'purge',
  description: 'Bulk delete messages. Usage: purge <count>',
  async execute(client, message, args) {
    if (!message.member.permissions.has('ManageMessages')) return message.channel.send('You need Manage Messages permission.');
    const count = parseInt(args[0], 10);
    if (isNaN(count) || count < 1 || count > 100) return message.channel.send('Provide a number 1-100.');
    try {
      const deleted = await message.channel.bulkDelete(count + 1, true);
      message.channel.send(`Deleted ${deleted.size - 1} messages.`).then(m => setTimeout(()=>m.delete(),3000));
    } catch (err) {
      console.error(err);
      message.channel.send('Failed to delete messages.');
    }
  }
};
