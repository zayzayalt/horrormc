const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const { createHealthServer, getBindConfig } = require('../src/utils/server');

test('bind config uses the requested host and port from environment', () => {
  const config = getBindConfig({ HOST: '51.210.117.84', PORT: '3000' });

  assert.equal(config.host, '51.210.117.84');
  assert.equal(config.port, 3000);
});

test('root page serves a themed console panel with live log data', async () => {
  const server = createHealthServer({ host: '127.0.0.1', port: 0 });
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Pterodactyl/i);
    assert.match(body, /Live Console/i);
    assert.match(body, /HorrorMC/i);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('status endpoint reports bot state and indicator colors', async () => {
  const server = createHealthServer({ host: '127.0.0.1', port: 0 });
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/status`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.match(body.state, /online|offline|starting|stopped/i);
    assert.match(body.color, /green|red|yellow|gray/i);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
