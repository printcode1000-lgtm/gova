import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfilePageContent } from "@/features/profile/ui";
import {
  loadPublicProfileShareRecord,
  profileShareMetadata,
} from "@/features/sharing/server";

interface ProfileSharePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  searchParams,
}: ProfileSharePageProps): Promise<Metadata> {
  const params = await searchParams;
  const uid = params.uid;
  return profileShareMetadata(typeof uid === "string" ? uid : "");
}

export default async function ProfileSharePage({
  searchParams,
}: ProfileSharePageProps) {
  const params = await searchParams;
  const uid = typeof params.uid === "string" ? params.uid : "";
  // The loader logs its own failures and returns null, so a shared link still
  // opens on the client-side path.
  const initialPublicProfile = uid
    ? await loadPublicProfileShareRecord(uid)
    : null;
  return (
    <Suspense fallback={null}>
      <ProfilePageContent id="s.profile.page.profile-page-content" initialPublicProfile={initialPublicProfile} />
    </Suspense>
  );
}
