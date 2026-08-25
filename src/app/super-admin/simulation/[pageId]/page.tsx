import { USER_PAGE_REGISTRY, userPageById } from "@asol/simulation-core";
import { notFound } from "next/navigation";

import { SuperAdminPageSimulation } from "@/features/simulation/ui";

export function generateStaticParams() {
  return USER_PAGE_REGISTRY.map((page) => ({ pageId: page.id }));
}

export default async function Page({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const page = userPageById(pageId);
  if (!page) notFound();
  return <SuperAdminPageSimulation page={page} />;
}
