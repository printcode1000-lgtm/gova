import { notFound } from 'next/navigation';

import { DeveloperCategorySelector } from '@/features/dev-tools/presentation/DeveloperCategorySelector';
import { isDevelopment } from '@/core/config';

export default function DeveloperCategorySelectorPage() {
  if (!isDevelopment) {
    notFound();
  }

  return <DeveloperCategorySelector />;
}
