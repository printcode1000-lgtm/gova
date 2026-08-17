import type { PersistentSystemLogInput } from './entities/persistent-system-log.entity';
import { captureSystemLog } from '@asol/system-logs-core';

export function submitPersistentClientLog(input: PersistentSystemLogInput) {
  if (typeof window === 'undefined') return;
  void captureSystemLog(input, { memory: false, emitConsole: false });
}
