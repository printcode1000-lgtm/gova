#!/usr/bin/env tsx
import { execSync } from 'child_process';

const PORTS = [3000];

function killPortWindows(port: number): void {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' });
    const pids = new Set<number>();
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.includes('LISTENING')) continue;
      const pid = Number(trimmed.split(/\s+/).pop());
      if (pid > 0) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`Stopped process ${pid} on port ${port}`);
      } catch {
        /* already stopped */
      }
    }
  } catch {
    /* no process on port */
  }
}

for (const port of PORTS) {
  killPortWindows(port);
}
