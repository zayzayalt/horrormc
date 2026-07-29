module.exports = {
  name: 'ready',
  execute(client) {
    console.log(`Bot ready: ${client.user.tag}`);
  }
};
