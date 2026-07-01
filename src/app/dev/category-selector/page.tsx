import { notFound } from 'next/navigation';

import { DeveloperCategorySelector } from '@/components/dev/DeveloperCategorySelector';
import { isDevelopment } from '@/core/config';

export default function DeveloperCategorySelectorPage() {
  if (!isDevelopment) {
    notFound();
  }

  return <DeveloperCategorySelector />;
}
