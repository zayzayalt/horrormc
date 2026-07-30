const http = require('http');

let logBuffer = [];
const MAX_LOG_LINES = 250;

function appendLogLine(line) {
  logBuffer.push(String(line));
  if (logBuffer.length > MAX_LOG_LINES) logBuffer.shift();
}

function getBindConfig(env = process.env) {
  return {
    host: env.HOST || '0.0.0.0',
    port: Number(env.PORT || 3000)
  };
}

function createHealthServer({ host, port } = getBindConfig()) {
  const server = http.createServer((req, res) => {
    const url = req.url || '/';

    if (url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, host, port }));
      return;
    }

    if (url === '/logs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logs: logBuffer }));
      return;
    }

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>HorrorMC Bot Console</title>
    <style>
      body { font-family: monospace; background: #0f172a; color: #e2e8f0; padding: 16px; }
      pre { white-space: pre-wrap; word-break: break-word; background: #020617; padding: 16px; border-radius: 8px; overflow-x: auto; }
      .status { color: #4ade80; margin-bottom: 12px; }
    </style>
  </head>
  <body>
    <div class="status">Live console for HorrorMC bot</div>
    <pre id="output">Loading logs...</pre>
    <script>
      async function refresh() {
        try {
          const res = await fetch('/logs');
          const data = await res.json();
          document.getElementById('output').textContent = data.logs.join('\n');
        } catch (err) {
          document.getElementById('output').textContent = 'Unable to load logs.';
        }
      }
      refresh();
      setInterval(refresh, 2000);
    </script>
  </body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  const start = (bindHost) => {
    server.listen(port, bindHost, () => {
      console.log(`[SERVER] Listening on http://${bindHost}:${port}`);
    });
  };

  server.on('error', (err) => {
    if (err.code === 'EADDRNOTAVAIL' && host !== '0.0.0.0') {
      console.warn(`[SERVER] Requested host ${host} is not available; falling back to 0.0.0.0`);
      start('0.0.0.0');
      return;
    }

    console.error('[SERVER] Failed to start HTTP server', err);
    process.exit(1);
  });

  start(host);
  return server;
}

module.exports = { getBindConfig, createHealthServer, appendLogLine };
