#!/usr/bin/env tsx
import { execFileSync } from 'child_process';

const PORTS = [3001];

function listWindowsListeners(port: number): Set<number> {
  const pids = new Set<number>();

  try {
    const out = execFileSync('netstat', ['-ano', '-p', 'tcp'], {
      encoding: 'utf-8',
      windowsHide: true,
    });

    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      const columns = trimmed.split(/\s+/);
      const localAddress = columns[1] ?? '';
      const state = columns[3] ?? '';
      const pid = Number(columns[4]);

      if (state !== 'LISTENING' || !localAddress.endsWith(`:${port}`)) continue;
      if (pid > 0) pids.add(pid);
    }
  } catch {
    // netstat can fail when it is unavailable; treat that as no listeners.
  }

  return pids;
}

function listUnixListeners(port: number): Set<number> {
  try {
    const out = execFileSync('lsof', [`-tiTCP:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf-8',
    });

    return new Set(
      out
        .split(/\r?\n/)
        .map(Number)
        .filter((pid) => Number.isInteger(pid) && pid > 0),
    );
  } catch {
    return new Set();
  }
}

function stopProcessTree(pid: number): void {
  try {
    if (process.platform === 'win32') {
      // /T stops the listener and every child process it spawned.
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch {
    // The process may have already exited between discovery and termination.
  }
}

let stoppedCount = 0;

for (const port of PORTS) {
  const pids =
    process.platform === 'win32' ? listWindowsListeners(port) : listUnixListeners(port);

  for (const pid of pids) {
    stopProcessTree(pid);
    stoppedCount += 1;
    console.log(`Stopped process tree ${pid} using port ${port}.`);
  }
}

if (stoppedCount === 0) {
  console.log(`No development server is using port ${PORTS.join(', ')}.`);
}
