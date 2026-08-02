"use client";

import { RouteErrorFallback } from "@/features/system-logs/RouteErrorFallback";

export default function RegistrationError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback {...props} feature="Authentication" route="/registration" />;
}

