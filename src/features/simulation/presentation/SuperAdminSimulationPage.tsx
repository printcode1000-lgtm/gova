"use client";

import { SIMULATION_SCENARIOS, USER_PAGE_REGISTRY, resolveSimulationRuntime } from "@asol/simulation-core";
import { FlaskConical, Layers3, MonitorSmartphone } from "lucide-react";
import Link from "next/link";

import { getClientRuntimeContext } from "@/core/config/runtime-context.client";
import { isSuperAdmin } from "@/features/auth";
import { useSession } from "@/features/auth/ui";
import { SimulationUsersStatus } from "./SimulationUsersStatus";
import { simulationRuntimeLabel } from "./simulation-runtime-label";

export function SuperAdminSimulationPage() {
  const { session, isLoading } = useSession();
  const runtime = resolveSimulationRuntime(getClientRuntimeContext());

  if (isLoading) return <div className="p-4 text-sm text-on-surface-variant">جاري التحميل...</div>;
  if (!isSuperAdmin(session)) {
    return <div className="mx-auto max-w-2xl p-6 text-error">هذه الصفحة متاحة للسوبر أدمن فقط.</div>;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-on-surface">
            <FlaskConical className="h-6 w-6" aria-hidden />
            محاكاة المستخدم وE2E
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            تشغيل تفاعلات الصفحات الحقيقية ومشاهدة مراحل التنفيذ والنتائج.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-primary-container px-3 py-2 text-sm text-on-primary-container">
          <MonitorSmartphone className="h-4 w-4" aria-hidden />
          {simulationRuntimeLabel(runtime)}
        </div>
      </header>

      <SimulationUsersStatus />

      <section className="space-y-3 rounded-2xl border border-outline-variant bg-surface p-4">
        <div>
          <h2 className="font-bold text-on-surface">حاوية الصفحات</h2>
          <p className="text-xs text-on-surface-variant">{USER_PAGE_REGISTRY.length} صفحة مستخدم مغطاة.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {USER_PAGE_REGISTRY.map((page) => (
            <Link
              key={page.id}
              href={`/super-admin/simulation/${page.id}`}
              className="rounded-xl border border-outline-variant bg-surface-container-low p-4 no-underline transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="font-semibold text-on-surface">{page.label}</div>
              <div className="mt-1 text-xs text-primary" dir="ltr">{page.route}</div>
              <div className="mt-2 text-xs text-on-surface-variant">{page.interactions.length} تفاعل</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-outline-variant bg-surface p-5 text-center">
        <Layers3 className="mx-auto h-7 w-7 text-on-surface-variant" aria-hidden />
        <h2 className="mt-2 font-bold text-on-surface">حاوية السيناريوهات</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          {SIMULATION_SCENARIOS.length === 0 ? "فارغة في الإصدار الأول كما هو مخطط." : `${SIMULATION_SCENARIOS.length} سيناريو`}
        </p>
      </section>
    </main>
  );
}
