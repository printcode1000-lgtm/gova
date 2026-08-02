import { SplashData, InitializationProgress } from '@/types/splash';

import { getRandomCategories, getRandomSubcategories } from '../images/selectors';

export const INITIALIZATION_STATUS_KEYS = [
  'init.starting',
  'init.settingsLoaded',
  'init.categoriesLoaded',
  'init.splashDataLoaded',
  'init.ready',
] as const;

export type InitializationStatusKey = (typeof INITIALIZATION_STATUS_KEYS)[number];

const INITIALIZATION_MILESTONES: InitializationProgress[] = [
  { progress: 0, statusKey: 'init.starting' },
  { progress: 25, statusKey: 'init.settingsLoaded' },
  { progress: 50, statusKey: 'init.categoriesLoaded' },
  { progress: 75, statusKey: 'init.splashDataLoaded' },
  { progress: 100, statusKey: 'init.ready' },
];

async function loadSettings(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
}

export async function runInitialization(
  onProgress: (progress: InitializationProgress) => void,
): Promise<SplashData> {
  onProgress(INITIALIZATION_MILESTONES[0]!);

  await loadSettings();
  onProgress(INITIALIZATION_MILESTONES[1]!);

  const categories = await getRandomCategories(6);
  onProgress(INITIALIZATION_MILESTONES[2]!);

  const subcategories = await getRandomSubcategories(15);
  onProgress(INITIALIZATION_MILESTONES[3]!);

  onProgress(INITIALIZATION_MILESTONES[4]!);

  return { categories, subcategories };
}
