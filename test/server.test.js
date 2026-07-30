const test = require('node:test');
const assert = require('node:assert/strict');

const { getBindConfig } = require('../src/utils/server');

test('bind config uses the requested host and port from environment', () => {
  const config = getBindConfig({ HOST: '51.210.117.84', PORT: '3000' });

  assert.equal(config.host, '51.210.117.84');
  assert.equal(config.port, 3000);
});
