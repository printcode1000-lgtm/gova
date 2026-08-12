"use client";

import { RouteErrorFallback } from "@/features/system-logs/RouteErrorFallback";

export default function HomeError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback {...props} feature="Home" route="/home" />;
}

