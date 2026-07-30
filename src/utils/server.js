const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

let logBuffer = [];
const MAX_LOG_LINES = 250;
let botState = 'offline';
let botProcess = null;
let botStartRequested = false;

function appendLogLine(line) {
  logBuffer.push(String(line));
  if (logBuffer.length > MAX_LOG_LINES) logBuffer.shift();
}

function getBotStatus() {
  const statusMap = {
    online: { state: 'online', color: 'green', label: 'Online' },
    starting: { state: 'starting', color: 'yellow', label: 'Starting' },
    stopping: { state: 'stopping', color: 'yellow', label: 'Stopping' },
    offline: { state: 'offline', color: 'red', label: 'Offline' },
    stopped: { state: 'stopped', color: 'red', label: 'Stopped' }
  };
  return statusMap[botState] || { state: botState, color: 'gray', label: botState };
}

function setBotState(nextState) {
  botState = nextState;
}

function stopBotProcess() {
  if (!botProcess || botProcess.killed) {
    setBotState('offline');
    return;
  }

  setBotState('stopping');
  botProcess.kill('SIGTERM');
}

function startBotProcess() {
  if (botProcess && !botProcess.killed) {
    setBotState('online');
    return;
  }

  setBotState('starting');
  botStartRequested = true;
  const script = path.join(process.cwd(), 'scripts', 'start-bot.sh');
  const child = spawn('bash', [script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => {
    appendLogLine(chunk.toString());
  });

  child.stderr.on('data', (chunk) => {
    appendLogLine(chunk.toString());
  });

  child.on('spawn', () => {
    botProcess = child;
    setBotState('online');
  });

  child.on('exit', (code) => {
    botProcess = null;
    setBotState(code === 0 ? 'stopped' : 'offline');
  });

  child.on('error', () => {
    botProcess = null;
    setBotState('offline');
  });
}

function restartBotProcess() {
  stopBotProcess();
  setTimeout(() => startBotProcess(), 700);
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
    const pathname = new URL(url, 'http://127.0.0.1').pathname;

    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, host, port, logs: logBuffer.length }));
      return;
    }

    if (pathname === '/logs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logs: logBuffer, count: logBuffer.length }));
      return;
    }

    if (pathname === '/status') {
      const status = getBotStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...status, online: status.state === 'online', count: logBuffer.length }));
      return;
    }

    if (pathname.startsWith('/actions/')) {
      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
        return;
      }

      const action = pathname.split('/')[2];
      if (action === 'start') {
        startBotProcess();
      } else if (action === 'stop') {
        stopBotProcess();
      } else if (action === 'restart') {
        restartBotProcess();
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Unknown action' }));
        return;
      }

      const status = getBotStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, action, status }));
      return;
    }

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Pterodactyl Console | HorrorMC</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #060816;
        --panel: #12172d;
        --panel-2: #1b2550;
        --accent: #4dd0ff;
        --accent-2: #7c5cff;
        --text: #ecf2ff;
        --muted: #8fa3c6;
        --success: #2ee6a8;
        --warning: #ffd166;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
        background: radial-gradient(circle at top left, rgba(77,208,255,.18), transparent 28%), var(--bg);
        color: var(--text);
        min-height: 100vh;
        padding: 24px;
      }
      .shell {
        max-width: 1200px;
        margin: 0 auto;
        border: 1px solid rgba(77,208,255,.2);
        border-radius: 18px;
        background: rgba(18,23,45,.95);
        box-shadow: 0 20px 40px rgba(0,0,0,.35);
        overflow: hidden;
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        background: linear-gradient(90deg, rgba(124,92,255,.35), rgba(77,208,255,.15));
        border-bottom: 1px solid rgba(77,208,255,.18);
      }
      .brand { display: flex; align-items: center; gap: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      .brand .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--success); box-shadow: 0 0 10px var(--success); }
      .badge { padding: 6px 10px; border-radius: 999px; background: rgba(77,208,255,.16); color: var(--accent); font-size: .85rem; }
      .grid { display: grid; grid-template-columns: 1.3fr .7fr; gap: 18px; padding: 18px; }
      .panel { background: var(--panel); border-radius: 14px; border: 1px solid rgba(255,255,255,.08); overflow: hidden; }
      .panel-header { padding: 14px 16px; background: rgba(255,255,255,.03); border-bottom: 1px solid rgba(255,255,255,.08); font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
      .console { padding: 16px; font-family: "JetBrains Mono", Consolas, monospace; font-size: .94rem; line-height: 1.6; white-space: pre-wrap; word-break: break-word; background: linear-gradient(180deg, rgba(2,7,26,.93), rgba(2,6,23,.98)); min-height: 340px; max-height: 420px; overflow: auto; }
      .controls { display: flex; flex-wrap: wrap; gap: 10px; padding: 16px 16px 0; }
      .btn { border: 0; border-radius: 999px; padding: 8px 12px; font-weight: 600; cursor: pointer; color: white; }
      .btn-start { background: linear-gradient(90deg, #2ee6a8, #15a972); }
      .btn-stop { background: linear-gradient(90deg, #ff5d5d, #d33b3b); }
      .btn-restart { background: linear-gradient(90deg, #4dd0ff, #2563eb); }
      .status-row { display: flex; align-items: center; gap: 8px; padding: 0 16px 16px; color: var(--muted); }
      .status-dot { width: 10px; height: 10px; border-radius: 50%; background: #ff5d5d; box-shadow: 0 0 8px currentColor; }
      .status-dot.green { background: #2ee6a8; box-shadow: 0 0 10px #2ee6a8; }
      .status-dot.yellow { background: #ffd166; box-shadow: 0 0 10px #ffd166; }
      .status-dot.red { background: #ff5d5d; box-shadow: 0 0 10px #ff5d5d; }
      .status-dot.gray { background: #9ca3af; box-shadow: 0 0 10px #9ca3af; }
      .meta { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
      .stat { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,.08); color: var(--muted); }
      .stat strong { color: var(--text); }
      .pill { display: inline-block; padding: 4px 8px; border-radius: 999px; background: rgba(46,230,168,.16); color: var(--success); font-size: .78rem; margin-left: 8px; }
      .footer { padding: 0 18px 18px; color: var(--muted); font-size: .84rem; }
      @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } .console { max-height: 320px; } }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="topbar">
        <div class="brand"><span class="dot"></span> Pterodactyl Console · HorrorMC</div>
        <div class="badge">Live Console</div>
      </div>
      <div class="grid">
        <div class="panel">
          <div class="panel-header">Server Output <span class="pill">streaming</span></div>
          <div class="controls">
            <button class="btn btn-start" onclick="runAction('start')">Start</button>
            <button class="btn btn-stop" onclick="runAction('stop')">Stop</button>
            <button class="btn btn-restart" onclick="runAction('restart')">Restart</button>
          </div>
          <div class="status-row"><span id="statusDot" class="status-dot red"></span><span id="statusLabel">Offline</span></div>
          <div id="output" class="console">Loading logs...</div>
        </div>
        <div class="panel">
          <div class="panel-header">Instance Status</div>
          <div class="meta">
            <div class="stat"><span>Panel</span><strong>HorrorMC Bot</strong></div>
            <div class="stat"><span>Mode</span><strong>Live Tail</strong></div>
            <div class="stat"><span>Host</span><strong>${host}</strong></div>
            <div class="stat"><span>Port</span><strong>${port}</strong></div>
            <div class="stat"><span>Log Lines</span><strong id="count">0</strong></div>
          </div>
        </div>
      </div>
      <div class="footer">Linked to the bot terminal stream. Refreshes automatically every 2 seconds.</div>
    </div>
    <script>
      async function refresh() {
        try {
          const [logsRes, statusRes] = await Promise.all([fetch('/logs'), fetch('/status')]);
          const data = await logsRes.json();
          const status = await statusRes.json();
          const output = document.getElementById('output');
          const count = document.getElementById('count');
          const statusDot = document.getElementById('statusDot');
          const statusLabel = document.getElementById('statusLabel');
          const startButton = document.querySelector('.btn-start');
          const stopButton = document.querySelector('.btn-stop');
          const restartButton = document.querySelector('.btn-restart');

          output.textContent = data.logs.length ? data.logs.join('\n') : 'Waiting for bot output...';
          count.textContent = status.count || data.logs.length || 0;
          statusLabel.textContent = status.label || status.state || 'Unknown';
          statusDot.className = 'status-dot ' + (status.color || 'gray');

          startButton.disabled = status.state === 'online' || status.state === 'starting' || status.state === 'restarting';
          stopButton.disabled = status.state === 'offline' || status.state === 'stopped' || status.state === 'stopping';
          restartButton.disabled = status.state === 'starting' || status.state === 'stopping' || status.state === 'restarting';
        } catch (err) {
          document.getElementById('output').textContent = 'Unable to load logs.';
          document.getElementById('count').textContent = '0';
        }
      }

      async function runAction(action) {
        try {
          const res = await fetch('/actions/' + action, { method: 'POST' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Request failed');
          await refresh();
        } catch (err) {
          document.getElementById('output').textContent = 'Unable to send control action: ' + err.message;
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
