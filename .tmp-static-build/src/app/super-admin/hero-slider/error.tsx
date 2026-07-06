"use client";

import { RouteErrorFallback } from "@/features/system-logs/RouteErrorFallback";

export default function HeroSliderAdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback {...props} feature="HeroSliderAdmin" route="/super-admin/hero-slider" />;
}

