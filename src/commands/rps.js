module.exports = {
  name: 'rps',
  description: 'Play rock-paper-scissors. Usage: rps <rock|paper|scissors>',
  async execute(client, message, args) {
    const choice = args[0] && args[0].toLowerCase();
    if (!['rock','paper','scissors'].includes(choice)) return message.channel.send('Choose rock, paper or scissors.');
    const options = ['rock','paper','scissors'];
    const bot = options[Math.floor(Math.random()*options.length)];
    let result = 'tie';
    if ((choice==='rock'&&bot==='scissors')||(choice==='paper'&&bot==='rock')||(choice==='scissors'&&bot==='paper')) result = 'win';
    if ((bot==='rock'&&choice==='scissors')||(bot==='paper'&&choice==='rock')||(bot==='scissors'&&choice==='paper')) result = 'lose';
    message.channel.send(`You: ${choice} | Bot: ${bot} → ${result}`);
  }
};
