import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { GOVA_DECLARATION, deployAccountRootApp } from '@asol/vercel-deploy-core';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

deployAccountRootApp({ declaration: GOVA_DECLARATION })
  .then((report) => console.log(`[ASOL_DEPLOY_REPORT] ${JSON.stringify(report)}`))
  .catch((error) => {
    console.error('Main app deploy failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
