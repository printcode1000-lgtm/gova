#!/usr/bin/env tsx
import { execFileSync } from 'child_process';

const PORTS = [3001];

function localAddressUsesPort(localAddress: string, port: number): boolean {
  return localAddress.endsWith(`:${port}`);
}

function wait(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function listWindowsPortProcesses(port: number): Set<number> {
  const pids = new Set<number>();

  try {
    const out = execFileSync('netstat', ['-ano'], {
      encoding: 'utf-8',
      windowsHide: true,
    });

    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('TCP') && !trimmed.startsWith('UDP')) continue;
      const columns = trimmed.split(/\s+/);
      const localAddress = columns[1] ?? '';
      const pid = Number(columns[columns.length - 1]);

      if (!localAddressUsesPort(localAddress, port)) continue;
      if (pid > 0) pids.add(pid);
    }
  } catch {
    // netstat can fail when it is unavailable; treat that as no known port users.
  }

  return pids;
}

function listUnixPortProcesses(port: number): Set<number> {
  // 1. Try lsof
  try {
    const out = execFileSync('lsof', ['-ti', `:${port}`], {
      encoding: 'utf-8',
    });

    const pids = out
      .split(/\r?\n/)
      .map(Number)
      .filter((pid) => Number.isInteger(pid) && pid > 0);

    if (pids.length > 0) return new Set(pids);
  } catch {
    // Fall through to next method
  }

  // 2. Try fuser
  try {
    const out = execFileSync('fuser', [`${port}/tcp`], {
      encoding: 'utf-8',
    });

    const parts = out.split(':');
    if (parts.length > 1) {
      const matches = parts[1].match(/\d+/g);
      if (matches) {
        const pids = matches
          .map(Number)
          .filter((pid) => Number.isInteger(pid) && pid > 0);
        if (pids.length > 0) return new Set(pids);
      }
    }
  } catch {
    // Fall through to next method
  }

  // 3. Try ss
  try {
    const out = execFileSync('ss', ['-tulpn'], {
      encoding: 'utf-8',
    });

    const pids = new Set<number>();
    for (const line of out.split(/\r?\n/)) {
      if (line.includes(`:${port}`)) {
        const pidMatches = line.matchAll(/pid=(\d+)/g);
        for (const match of pidMatches) {
          const pid = Number(match[1]);
          if (Number.isInteger(pid) && pid > 0) pids.add(pid);
        }
      }
    }
    if (pids.size > 0) return pids;
  } catch {
    // Fall through to next method
  }

  // 4. Try netstat (Unix/Linux)
  try {
    const out = execFileSync('netstat', ['-tlpn'], {
      encoding: 'utf-8',
    });

    const pids = new Set<number>();
    for (const line of out.split(/\r?\n/)) {
      if (line.includes(`:${port}`)) {
        const match = line.match(/(\d+)\/[a-zA-Z0-9_-]+/);
        if (match) {
          const pid = Number(match[1]);
          if (Number.isInteger(pid) && pid > 0) pids.add(pid);
        }
      }
    }
    if (pids.size > 0) return pids;
  } catch {
    // Treat as no known port users.
  }

  return new Set();
}

function getUnixChildPids(pid: number): Set<number> {
  const children = new Set<number>();

  try {
    let out = '';
    try {
      out = execFileSync('pgrep', ['-P', String(pid)], { encoding: 'utf-8' });
    } catch {
      out = execFileSync('ps', ['--ppid', String(pid), '-o', 'pid='], {
        encoding: 'utf-8',
      });
    }

    for (const line of out.split(/\r?\n/)) {
      const cpid = Number(line.trim());
      if (Number.isInteger(cpid) && cpid > 0) {
        children.add(cpid);
        const grandChildren = getUnixChildPids(cpid);
        for (const gcpid of grandChildren) {
          children.add(gcpid);
        }
      }
    }
  } catch {
    // Process has no children or discovery tool unavailable
  }

  return children;
}

function stopProcessTree(pid: number, force = false): void {
  try {
    if (process.platform === 'win32') {
      // /T stops the port owner and every child process it spawned.
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      const targets = [pid, ...getUnixChildPids(pid)];
      const signal = force ? 'SIGKILL' : 'SIGTERM';
      for (const targetPid of targets) {
        try {
          process.kill(targetPid, signal);
        } catch {
          // Process may have already exited
        }
      }
    }
  } catch {
    // The process may have already exited between discovery and termination.
  }
}

function listPortProcesses(port: number): Set<number> {
  return process.platform === 'win32'
    ? listWindowsPortProcesses(port)
    : listUnixPortProcesses(port);
}

let stoppedCount = 0;

for (const port of PORTS) {
  const pids = listPortProcesses(port);

  for (const pid of pids) {
    stopProcessTree(pid);
    stoppedCount += 1;
    console.log(`Stopped process tree ${pid} using local port ${port}.`);
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const remainingPids = listPortProcesses(port);
    if (remainingPids.size === 0) break;
    for (const pid of remainingPids) stopProcessTree(pid, attempt >= 2);
    wait(100 * (attempt + 1));
  }

  const remainingPids = listPortProcesses(port);
  if (remainingPids.size > 0) {
    throw new Error(
      `Port ${port} is still used by process(es): ${[...remainingPids].join(', ')}`,
    );
  }
}

if (stoppedCount === 0) {
  console.log(`No process is using local port ${PORTS.join(', ')}.`);
}

