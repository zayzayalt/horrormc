module.exports = {
  name: 'ready',
  async execute(client) {
    const message = `Bot ready: ${client.user.tag}`;
    console.log(message);
    await client.logEvent('Bot ready', message, 0x2ecc71);
  }
};
