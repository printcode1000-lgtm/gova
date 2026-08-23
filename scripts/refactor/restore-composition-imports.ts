import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const pkgs = [
  'notifications-composition',
  'products-composition',
  'orders-composition',
  'profiles-composition',
  'submain-composition',
  'sub2main-composition',
];

for (const pkg of pkgs) {
  const text = execSync(`git show HEAD:packages/${pkg}/src/index.ts`, {
    encoding: 'utf8',
  });
  let next = text.replaceAll('@/modules/', '@/features/');
  next = next.replace(
    /(@\/features\/[A-Za-z0-9_-]+)\/entities\//g,
    '$1/domain/',
  );
  next = next.replace(
    /(@\/features\/[A-Za-z0-9_-]+)\/components\//g,
    '$1/presentation/',
  );
  writeFileSync(`packages/${pkg}/src/index.ts`, next);
  console.log('restored', pkg);
}
