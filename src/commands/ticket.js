const db = require('../utils/db');
module.exports = {
  name: 'ticket',
  description: 'Ticket system: ticket create/close',
  async execute(client, message, args) {
    const sub = args[0];
    if (sub === 'create') {
      const categoryId = process.env.TICKET_CATEGORY_ID;
      const channel = await message.guild.channels.create({
        name: `ticket-${message.author.username}`,
        type: 0,
        parent: categoryId || null,
        permissionOverwrites: [
          { id: message.guild.roles.everyone, deny: ['ViewChannel'] },
          { id: message.author.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
        ]
      }).catch(e=>{console.error(e);return null});
      if (!channel) return message.channel.send('Failed to create ticket channel.');
      db.prepare('INSERT INTO tickets (guild_id, channel_id, owner_id, status, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(message.guild.id, channel.id, message.author.id, 'open', Date.now());
      channel.send(`Ticket created by ${message.author}. Staff will be with you shortly.`);
      message.channel.send(`Ticket created: ${channel}`);
    } else if (sub === 'close') {
      const ch = message.channel;
      const row = db.prepare('SELECT id, owner_id FROM tickets WHERE channel_id = ?').get(ch.id);
      if (!row) return message.channel.send('This channel is not a ticket.');
      if (row.owner_id !== message.author.id && !message.member.permissions.has('ManageGuild')) return message.channel.send('Only the ticket owner or staff can close this ticket.');
      db.prepare('UPDATE tickets SET status = ? WHERE id = ?').run('closed', row.id);
      message.channel.send('Closing ticket in 5 seconds...').then(()=> setTimeout(()=> ch.delete().catch(()=>{}),5000));
    } else {
      message.channel.send('Usage: ticket create | ticket close');
    }
  }
};
