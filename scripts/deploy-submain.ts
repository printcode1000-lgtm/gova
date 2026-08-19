import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { deployAccountRootApp, SUBMAIN_DECLARATION } from '@asol/vercel-deploy-core';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

deployAccountRootApp({
  declaration: SUBMAIN_DECLARATION,
}).catch((error) => {
  console.error('Submain application deploy failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
