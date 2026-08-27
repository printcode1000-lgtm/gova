import Link from "next/link";
import {
  ChevronDown,
  FlaskConical,
  Megaphone,
  Rocket,
  ScrollText,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { cn } from "@/shared/utils";

export const COLLAPSED_SUPER_ADMIN_GROUPS = {
  content: false,
  notifications: false,
  system: false,
} as const;

export type SuperAdminGroupKey = keyof typeof COLLAPSED_SUPER_ADMIN_GROUPS;

function superAdminInnerSurface(variant: SuperAdminGroupKey) {
  switch (variant) {
    case "content":
      return "bg-surface-container-low";
    case "notifications":
      return "bg-secondary-container/20";
    case "system":
      return "bg-tertiary-container/15";
  }
}

export function AppSidebarSuperAdminSection({
  resolvedScheme,
  sidebarControlClass,
  sidebarIconClass,
  sidebarSmallIconClass,
  sidebarSurface,
  sidebarTone,
  sidebarPressSurface,
  superAdminOpen,
  superAdminGroupsOpen,
  onClose,
  onToggle,
  onGroupToggle,
}: {
  resolvedScheme: "dark" | "light";
  sidebarControlClass: string;
  sidebarIconClass: string;
  sidebarSmallIconClass: string;
  sidebarSurface: string;
  sidebarTone: string;
  sidebarPressSurface: string;
  superAdminOpen: boolean;
  superAdminGroupsOpen: Record<SuperAdminGroupKey, boolean>;
  onClose: () => void;
  onToggle: () => void;
  onGroupToggle: (group: SuperAdminGroupKey) => void;
}) {
  const itemClass = cn(
    "flex min-w-0 items-center gap-2 rounded-md px-3 py-2 text-sm leading-5 break-words",
    sidebarTone,
    sidebarPressSurface,
  );
  const groupButtonClass = cn(
    "flex w-full min-w-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold leading-5 break-words",
    sidebarTone,
    sidebarPressSurface,
  );
  const groupPanelClass =
    "ms-2 space-y-1 border-s border-outline-variant/40 ps-2";
  const innerShellBorder =
    resolvedScheme === "dark"
      ? "border-outline-variant/35"
      : "border-outline-variant/25";
  const innerShellBase = cn(
    "overflow-hidden rounded-xl border",
    innerShellBorder,
  );

  return (
    <div id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.div"
      className={cn(
        "asol-control overflow-hidden rounded-2xl border",
        resolvedScheme === "dark"
          ? "border-outline-variant/30"
          : "border-outline-variant/20",
        sidebarSurface,
      )}
    >
      <button id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.button"
        type="button"
        onClick={onToggle}
        aria-expanded={superAdminOpen}
        className={cn(sidebarControlClass, "rounded-none")}
      >
        <ShieldCheck id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.shield-check" className={sidebarIconClass} aria-hidden />
        <span id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.span" className="min-w-0 flex-1">لوحة تحكم السوبر أدمن</span>
        <ChevronDown id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.chevron-down"
          aria-hidden
          className={cn(
            "ms-auto h-4 w-4 shrink-0 transition-transform",
            superAdminOpen && "rotate-180",
          )}
        />
      </button>
      {superAdminOpen && (
        <div id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.div.2" className="space-y-2 px-2 pb-3 sm:px-3 sm:pe-3 sm:ps-11">
          <SuperAdminGroup id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.super-admin-group"
            icon={<Sliders id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.sliders" className={sidebarSmallIconClass} />}
            label="واجهة المتجر والعروض"
            open={superAdminGroupsOpen.content}
            buttonClass={groupButtonClass}
            panelClass={groupPanelClass}
            shellClass={cn(innerShellBase, superAdminInnerSurface("content"))}
            onToggle={() => onGroupToggle("content")}
          >
            <SuperAdminLink id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.super-admin-link" href="/super-admin/hero-slider" icon={<Sliders id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.sliders.2" className={sidebarSmallIconClass} />} label="سلايدر الواجهة الرئيسية" className={itemClass} onClose={onClose} />
            <SuperAdminLink id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.super-admin-link.2" href="/super-admin/featured-marquee" icon={<Sparkles id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.sparkles" className={sidebarSmallIconClass} />} label="شريط المنتجات المميزة" className={itemClass} onClose={onClose} />
            <SuperAdminLink id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.super-admin-link.3" href="/super-admin/trending-ribbon" icon={<TrendingUp id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.trending-up" className={sidebarSmallIconClass} />} label="الشريط الإخباري المتحرك" className={itemClass} onClose={onClose} />
          </SuperAdminGroup>

          <SuperAdminGroup id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.super-admin-group.2"
            icon={<Megaphone id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.megaphone" className={sidebarSmallIconClass} />}
            label="الإشعارات والبث"
            open={superAdminGroupsOpen.notifications}
            buttonClass={groupButtonClass}
            panelClass={groupPanelClass}
            shellClass={cn(innerShellBase, superAdminInnerSurface("notifications"))}
            onToggle={() => onGroupToggle("notifications")}
          >
            <SuperAdminLink id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.super-admin-link.4" href="/super-admin/notifications-broadcast" icon={<Megaphone id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.megaphone.2" className={sidebarSmallIconClass} />} label="بث إشعار لكل المستخدمين" className={itemClass} onClose={onClose} />
          </SuperAdminGroup>

          <SuperAdminGroup id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.super-admin-group.3"
            icon={<ShieldCheck id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.shield-check.2" className={sidebarSmallIconClass} />}
            label="النظام وحسابات المستخدمين"
            open={superAdminGroupsOpen.system}
            buttonClass={groupButtonClass}
            panelClass={groupPanelClass}
            shellClass={cn(innerShellBase, superAdminInnerSurface("system"))}
            onToggle={() => onGroupToggle("system")}
          >
            <SuperAdminLink id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.super-admin-link.5" href="/super-admin/logs" icon={<ScrollText id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.scroll-text" className={sidebarSmallIconClass} />} label="سجل أحداث النظام" className={itemClass} onClose={onClose} />
            <SuperAdminLink id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.super-admin-link.6" href="/super-admin/users" icon={<Users id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.users" className={sidebarSmallIconClass} />} label="إدارة حسابات المستخدمين" className={itemClass} onClose={onClose} />
            <SuperAdminLink id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.super-admin-link.7" href="/super-admin/production-deploy" icon={<Rocket id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.rocket" className={sidebarSmallIconClass} />} label="النشر إلى الإنتاج" className={itemClass} onClose={onClose} />
            <SuperAdminLink id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.super-admin-link.8" href="/super-admin/simulation" icon={<FlaskConical id="shared.layouts.app-sidebar.app-sidebar-super-admin-section.flask-conical" className={sidebarSmallIconClass} />} label="محاكاة المستخدم وE2E" className={itemClass} onClose={onClose} />
          </SuperAdminGroup>
        </div>
      )}
    </div>
  );
}

function SuperAdminGroup({ id,
  icon,
  label,
  open,
  buttonClass,
  panelClass,
  shellClass,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  buttonClass: string;
  panelClass: string;
  shellClass: string;
  onToggle: () => void;
  children: React.ReactNode;
} & { id?: string }) {
  return (
    <div id={id} className={shellClass}>
      <button type="button" onClick={onToggle} aria-expanded={open} className={buttonClass}>
        {icon}
        {label}
        <ChevronDown className={cn("ms-auto h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className={panelClass}>{children}</div>}
    </div>
  );
}

function SuperAdminLink({ id,
  href,
  icon,
  label,
  className,
  onClose,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  className: string;
  onClose: () => void;
} & { id?: string }) {
  return (
    <Link id={id} href={href} onClick={onClose} className={className}>
      {icon}
      {label}
    </Link>
  );
}
