const db = require('../utils/db');

module.exports = {
  name: 'apply',
  description: 'Start an application flow via DM: apply start',
  async execute(client, message, args) {
    const sub = args[0];
    if (sub !== 'start') return message.channel.send('Usage: apply start');
    try {
      await message.author.send('Starting application. Reply with your answers. Type `cancel` to stop.');
    } catch (e) {
      return message.channel.send('I cannot DM you. Please open DMs and try again.');
    }
    const questions = [
      'What is your Discord name and timezone?',
      'Why do you want to join? (short answer)',
      'What relevant experience do you have?'
    ];
    const answers = [];
    const dm = await message.author.createDM();
    const collector = dm.createMessageCollector({ max: questions.length, time: 1000 * 60 * 5 });
    let i = 0;
    dm.send(questions[i]);
    collector.on('collect', m => {
      if (m.content.toLowerCase() === 'cancel') { collector.stop('cancel'); return; }
      answers.push(m.content);
      i += 1;
      if (i < questions.length) dm.send(questions[i]);
      else collector.stop('done');
    });
    collector.on('end', (collected, reason) => {
      if (reason === 'cancel') return dm.send('Application cancelled.');
      if (!answers.length) return dm.send('No answers received.');
      // store
      db.prepare('INSERT INTO applications (guild_id, user_id, answers, status, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(message.guild.id, message.author.id, JSON.stringify(answers), 'pending', Date.now());
      dm.send('Application submitted. Thank you!');
      const appsChannelId = process.env.APPLICATIONS_CHANNEL_ID;
      if (appsChannelId) {
        const ch = message.guild.channels.cache.get(appsChannelId);
        if (ch) ch.send(`New application from ${message.author.tag}:\n${answers.map((a,idx)=>`Q${idx+1}: ${a}`).join('\n')}`);
      }
    });
  }
};
