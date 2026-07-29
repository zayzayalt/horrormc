module.exports = {
  name: 'trivia',
  description: 'Simple trivia skeleton (extend with question DB or API)',
  async execute(client, message, args) {
    const q = { question: 'What is 2+2?', answers: ['3','4','5'], correct: 1 };
    const sent = await message.channel.send(`Trivia: ${q.question}\n${q.answers.map((a,i)=>`${i+1}. ${a}`).join('\n')}`);
    message.channel.send('Reply with the number of the correct answer.');
    const filter = m => m.author.id === message.author.id;
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000 }).catch(()=>null);
    if (!collected || !collected.size) return message.channel.send('Time up.');
    const ans = parseInt(collected.first().content,10) - 1;
    if (ans === q.correct) message.channel.send('Correct!'); else message.channel.send('Incorrect.');
  }
};
