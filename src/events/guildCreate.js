module.exports = {
  name: 'guildCreate',
  async execute(client, guild) {
    const message = `Joined guild: ${guild.name} (${guild.id})`;
    console.log(message);
    await client.log(message);
  }
};
