import 'server-only';

import { registerSystemLogsCoreServerPorts } from '../system-logs-core-bootstrap.server';
import {
  persistentSystemLogService,
  logServerSystemIssue,
} from '@asol/system-logs-core/server';

registerSystemLogsCoreServerPorts();

export { persistentSystemLogService, logServerSystemIssue };
