const { spawn } = require('node:child_process');
const { networkInterfaces } = require('node:os');
const path = require('node:path');
const http = require('node:http');

const root = path.resolve(__dirname, '..');
const port = process.env.PORT || '3000';
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
function run(file, env) {
  const child = spawn(process.execPath, [file], { cwd: root, env, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code || 0); });
  return child;
}
run(path.join(root, 'server/index.mjs'), { ...process.env, ROOM_HOST: '127.0.0.1', ROOM_PORT: '3001', PUBLIC_PORT: port });
function waitForServer(attempt = 0) {
  if (stopping) return;
  const request = http.get('http://127.0.0.1:3001/api/health', response => {
    response.resume();
    if (response.statusCode !== 200) return retry();
    console.log(`\nLudo: http://localhost:${port}`);
    for (const addresses of Object.values(networkInterfaces())) {
      for (const a of addresses || []) if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) console.log(`LAN:  http://${a.address}:${port}`);
    }
    run(require.resolve('react-scripts/scripts/start'), { ...process.env, HOST: process.env.HOST || '0.0.0.0', PORT: port, BROWSER: process.env.BROWSER || 'none' });
  });
  request.on('error', retry);
  function retry() {
    if (attempt >= 50) { console.error('Room server did not start.'); stop(1); }
    else setTimeout(() => waitForServer(attempt + 1), 200);
  }
}
waitForServer();
