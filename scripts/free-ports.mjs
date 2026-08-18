/**
 * Free dev ports 3000 (web) and 4000 (api) on Windows/macOS/Linux.
 * Only terminates processes whose command line looks like this project's dev servers.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTS = [3000, 4000];
const isWin = process.platform === 'win32';
const rootMarker = path.basename(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));

function pidsOnPort(port) {
  try {
    if (isWin) {
      const out = execSync(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts.at(-1));
        if (Number.isFinite(pid) && pid > 0) pids.add(pid);
      }
      return [...pids];
    }
    const out = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return out
      .split(/\r?\n/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

function processInfo(pid) {
  try {
    if (isWin) {
      const out = execSync(
        `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId=${pid}\\").CommandLine"`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] },
      );
      return out.trim();
    }
    return execSync(`ps -p ${pid} -o command=`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function killPid(pid) {
  try {
    if (isWin) {
      execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' });
    } else {
      execSync(`kill -TERM ${pid}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

function isProjectDevProcess(cmd) {
  if (!cmd) return false;
  const lower = cmd.toLowerCase();
  if (!lower.includes('node')) return false;
  const markers = [
    rootMarker.toLowerCase(),
    'next dev',
    'ts-node-dev',
    'apps\\web',
    'apps/web',
    'apps\\api',
    'apps/api',
  ];
  return markers.some((m) => lower.includes(m));
}

let freed = 0;

for (const port of PORTS) {
  for (const pid of pidsOnPort(port)) {
    const cmd = processInfo(pid);
    if (!isProjectDevProcess(cmd)) {
      console.warn(`⚠ Port ${port} in use by PID ${pid} (not this project's dev server) — skipped.`);
      console.warn(`  ${cmd.slice(0, 120)}`);
      continue;
    }
    if (killPid(pid)) {
      console.log(`✓ Freed port ${port} (PID ${pid})`);
      freed += 1;
    }
  }
}

if (freed === 0) {
  console.log('Ports 3000 and 4000 are free (or in use by another app).');
}
