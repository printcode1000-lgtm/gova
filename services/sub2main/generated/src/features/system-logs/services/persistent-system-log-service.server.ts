import 'server-only';

import { registerSystemLogsCoreServerPorts } from '@/core/config/system-logs.server';
import {
  persistentSystemLogService,
  logServerSystemIssue,
} from '@asol/system-logs-core/server';

registerSystemLogsCoreServerPorts();

export { persistentSystemLogService, logServerSystemIssue };
