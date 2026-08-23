"use client";

import { RouteErrorFallback } from "@/features/system-logs/ui";

export default function RegistrationError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback {...props} feature="Authentication" route="/registration" />;
}

