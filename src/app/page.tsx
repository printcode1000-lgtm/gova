import { Suspense } from 'react';

import SplashScreen from '@/components/splash/SplashScreen';

export default function SplashPage() {
  return (
    <Suspense fallback={null}>
      <SplashScreen />
    </Suspense>
  );
}
