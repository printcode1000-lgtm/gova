import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfilePageContent } from "@/components/profile/ProfilePageContent";
import {
  loadPublicProfileShareRecord,
  profileShareMetadata,
} from "@/features/sharing/index.server";

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
  const initialPublicProfile = uid
    ? await loadPublicProfileShareRecord(uid).catch(() => null)
    : null;
  return (
    <Suspense fallback={null}>
      <ProfilePageContent initialPublicProfile={initialPublicProfile} />
    </Suspense>
  );
}
