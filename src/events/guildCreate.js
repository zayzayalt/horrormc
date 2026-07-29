module.exports = {
  name: 'guildCreate',
  async execute(client, guild) {
    const message = `Joined guild: ${guild.name} (${guild.id})`;
    console.log(message);
    await client.logEvent('Guild joined', message, 0x5865f2);
  }
};
