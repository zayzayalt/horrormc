function modOnly(member) {
  return member.permissions.has('BanMembers') || member.permissions.has('KickMembers') || member.roles.cache.some(r=>r.name.toLowerCase().includes('mod'));
}

module.exports = { modOnly };
