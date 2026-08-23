"use client";

import { RouteErrorFallback } from "@/features/system-logs/ui";

export default function ProfileError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback {...props} feature="Profile" route="/profile" />;
}

