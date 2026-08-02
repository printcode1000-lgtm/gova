"use client";

import { RouteErrorFallback } from "@/features/system-logs/RouteErrorFallback";

export default function LoginError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback {...props} feature="Authentication" route="/login" />;
}

