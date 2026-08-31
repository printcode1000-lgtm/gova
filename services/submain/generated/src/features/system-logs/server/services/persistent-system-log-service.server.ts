import 'server-only';

import { registerControlSystemLogPersistence } from '../control-persistence.server';
import {
  persistentSystemLogService,
  logServerSystemIssue,
} from '@asol/system-logs-core/server';

registerControlSystemLogPersistence();

export { persistentSystemLogService, logServerSystemIssue };
