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
  try {
    const out = execFileSync('lsof', ['-ti', `:${port}`], {
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
      // /T stops the port owner and every child process it spawned.
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
    for (const pid of remainingPids) stopProcessTree(pid);
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
