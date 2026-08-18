import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

// Free stale dev servers from prior sessions (common after aborted Ctrl+C on Windows)
spawnSync(process.execPath, [path.join(root, 'scripts/free-ports.mjs')], {
  stdio: 'inherit',
  cwd: root,
});

console.log(`
  ▲ My Shop Online (development)

  - Store:        http://localhost:3000/vi
  - Customer:     http://localhost:3000/vi/dang-nhap
  - Staff:        http://localhost:3000/vi/dang-nhap-nhan-vien
  - API:          http://localhost:4000/health

  Chọn VI / EN trên header để đổi ngôn ngữ và tiền tệ (VND / USD).

  Press Ctrl+C to stop both servers.
  Port still busy? Run: npm run dev:free
`);

const children = [
  spawn(npm, ['run', 'dev'], {
    cwd: path.join(root, 'apps/api'),
    stdio: 'inherit',
    shell: isWin,
    env: process.env,
  }),
  spawn(npm, ['run', 'dev'], {
    cwd: path.join(root, 'apps/web'),
    stdio: 'inherit',
    shell: isWin,
    env: process.env,
  }),
];

let stopping = false;

function killTree(child) {
  if (!child?.pid || child.killed) return;
  if (isWin) {
    try {
      spawnSync('taskkill', ['/PID', String(child.pid), '/F', '/T'], { stdio: 'ignore' });
    } catch {
      child.kill();
    }
  } else {
    child.kill('SIGTERM');
  }
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    killTree(child);
  }
  setTimeout(() => process.exit(code), 400);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (stopping) return;
    if (signal === 'SIGINT' || signal === 'SIGTERM') return;
    if (code && code !== 0) shutdown(code);
  });
}
