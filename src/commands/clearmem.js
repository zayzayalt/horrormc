const aiUtil = require('../utils/ai');
const db = require('../utils/db');

module.exports = {
  name: 'clearmem',
  description: 'Clear AI conversation memory for this channel. Usage: clearmem',
  async execute(client, message, args) {
    if (!message.member.permissions.has('ManageGuild')) return message.channel.send('You need Manage Server permission.');
    await aiUtil.clearHistory(message.guild.id, message.channel.id);
    message.channel.send('AI memory cleared for this channel.');
  }
};
