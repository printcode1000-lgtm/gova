import { Suspense } from 'react';

import SplashScreen from '@/components/splash/SplashScreen';
import { categoryService } from '@/features/categories';

export default function SplashPage() {
  const displayCategories = categoryService.getAllDisplayCategories();
  return (
    <Suspense fallback={null}>
      <SplashScreen displayCategories={displayCategories} />
    </Suspense>
  );
}
