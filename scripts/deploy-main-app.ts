import { existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { GOVA_DEPLOYMENT_DIR, buildGovaDeploymentTree } from '@asol/gova-deployment-core';
import { GOVA_DECLARATION, deployAccountRootApp } from '@asol/vercel-deploy-core';
import { assertReleaseDeploymentContext } from './assert-release-deployment-context';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ path: '.env', quiet: true });

assertReleaseDeploymentContext('main:deploy');

const deploymentDirectory = path.join(process.cwd(), GOVA_DEPLOYMENT_DIR);
buildGovaDeploymentTree(process.cwd());

deployAccountRootApp({ declaration: GOVA_DECLARATION, deploymentDirectory })
  .then((report) => console.log(`[ASOL_DEPLOY_REPORT] ${JSON.stringify(report)}`))
  .catch((error) => {
    console.error('Main app deploy failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
