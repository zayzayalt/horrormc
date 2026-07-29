const aiUtil = require('../utils/ai');
const db = require('../utils/db');

module.exports = {
  name: 'chat',
  description: 'Chat with the AI in this channel. Usage: chat <message>',
  async execute(client, message, args) {
    const text = args.join(' ');
    if (!text) return message.channel.send('Provide a message to send to the AI.');
    // fetch personality for this guild
    const settings = db.prepare('SELECT ai_personality FROM guild_settings WHERE guild_id = ?').get(message.guild.id) || {};
    const personality = settings.ai_personality || 'You are a helpful assistant.';
    // show typing while "thinking"
    try {
      await message.channel.sendTyping();
      await new Promise(resolve => setTimeout(resolve, 2200));
      const combined = await aiUtil.queryAIWithHistory({ guildId: message.guild.id, channelId: message.channel.id, userId: message.author.id, username: message.author.username, content: text, personality });
      if (!combined) return message.channel.send('No response from AI.');
      await message.reply({ content: combined, allowedMentions: { repliedUser: false, parse: [] } });
    } catch (e) {
      console.error('Chat command error', e);
      message.channel.send('AI error.');
    }
  }
};
