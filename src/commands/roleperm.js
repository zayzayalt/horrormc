const { PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'roleperm',
  description: 'Add/remove/set permissions on a role. Usage: roleperm add|remove|set <role> <perm> [perm...]',
  async execute(client, message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.channel.send('You need the Manage Roles permission.');
    const action = args[0];
    if (!['add','remove','set'].includes(action)) return message.channel.send('Usage: roleperm add|remove|set <role> <perm> [perm...]');
    const roleArg = args[1];
    if (!roleArg) return message.channel.send('Provide a role mention, id, or exact name.');
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(roleArg) || message.guild.roles.cache.find(r=>r.name === roleArg);
    if (!role) return message.channel.send('Role not found.');
    const perms = args.slice(2);
    if (!perms.length) return message.channel.send('Provide at least one permission name (e.g., BanMembers, ManageChannels).');

    const flags = PermissionsBitField.Flags;
    const resolved = [];
    const invalid = [];
    for (const p of perms) {
      // try direct match
      if (flags[p]) { resolved.push(flags[p]); continue; }
      // try case-insensitive match
      const found = Object.keys(flags).find(k => k.toLowerCase() === p.toLowerCase() || k.toLowerCase() === p.toLowerCase().replace(/_/g, ''));
      if (found) { resolved.push(flags[found]); continue; }
      // try snake/upper -> CamelCase
      const up = p.toUpperCase().replace(/ /g,'_');
      const found2 = Object.keys(flags).find(k => k.toUpperCase() === up);
      if (found2) { resolved.push(flags[found2]); continue; }
      invalid.push(p);
    }
    if (invalid.length) return message.channel.send(`Invalid permission names: ${invalid.join(', ')}`);

    try {
      let newPerms;
      if (action === 'add') newPerms = role.permissions.add(resolved);
      else if (action === 'remove') newPerms = role.permissions.remove(resolved);
      else newPerms = resolved;
      await role.setPermissions(newPerms);
      return message.channel.send(`Role ${role.name} permissions updated (${action}).`);
    } catch (err) {
      console.error('roleperm error', err);
      return message.channel.send('Failed to update role permissions.');
    }
  }
};
