module.exports = {
  name: 'guildCreate',
  execute(client, guild) {
    console.log(`Joined guild: ${guild.name} (${guild.id})`);
  }
};
