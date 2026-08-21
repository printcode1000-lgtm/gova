import Link from "next/link";
import {
  ChevronDown,
  Cloud,
  Megaphone,
  ScrollText,
  ShieldCheck,
  Sliders,
  Sparkles,
  TestTube2,
  TrendingUp,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const COLLAPSED_SUPER_ADMIN_GROUPS = {
  content: false,
  notifications: false,
  system: false,
} as const;

export type SuperAdminGroupKey = keyof typeof COLLAPSED_SUPER_ADMIN_GROUPS;

type SuperAdminInnerSurfaceKey = SuperAdminGroupKey | "cloud";

function superAdminInnerSurface(variant: SuperAdminInnerSurfaceKey) {
  switch (variant) {
    case "content":
      return "bg-surface-container-low";
    case "cloud":
      return "bg-primary-container/15";
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
    <div
      className={cn(
        "asol-control overflow-hidden rounded-2xl border",
        resolvedScheme === "dark"
          ? "border-outline-variant/30"
          : "border-outline-variant/20",
        sidebarSurface,
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={superAdminOpen}
        className={cn(sidebarControlClass, "rounded-none")}
      >
        <ShieldCheck className={sidebarIconClass} aria-hidden />
        <span className="min-w-0 flex-1">لوحة تحكم السوبر أدمن</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "ms-auto h-4 w-4 shrink-0 transition-transform",
            superAdminOpen && "rotate-180",
          )}
        />
      </button>
      {superAdminOpen && (
        <div className="space-y-2 px-2 pb-3 sm:px-3 sm:pe-3 sm:ps-11">
          <SuperAdminGroup
            icon={<Sliders className={sidebarSmallIconClass} />}
            label="واجهة المتجر والعروض"
            open={superAdminGroupsOpen.content}
            buttonClass={groupButtonClass}
            panelClass={groupPanelClass}
            shellClass={cn(innerShellBase, superAdminInnerSurface("content"))}
            onToggle={() => onGroupToggle("content")}
          >
            <SuperAdminLink href="/super-admin/hero-slider" icon={<Sliders className={sidebarSmallIconClass} />} label="سلايدر الواجهة الرئيسية" className={itemClass} onClose={onClose} />
            <SuperAdminLink href="/super-admin/featured-marquee" icon={<Sparkles className={sidebarSmallIconClass} />} label="شريط المنتجات المميزة" className={itemClass} onClose={onClose} />
            <SuperAdminLink href="/super-admin/trending-ribbon" icon={<TrendingUp className={sidebarSmallIconClass} />} label="الشريط الإخباري المتحرك" className={itemClass} onClose={onClose} />
          </SuperAdminGroup>

          <div
            className={cn(innerShellBase, "bg-primary-container/15")}
          >
            <Link href="/super-admin/cloud-accounts" onClick={onClose} className={groupButtonClass}>
              <Cloud className={sidebarSmallIconClass} />
              حسابات التخزين السحابي
            </Link>
          </div>

          <SuperAdminGroup
            icon={<Megaphone className={sidebarSmallIconClass} />}
            label="الإشعارات والبث"
            open={superAdminGroupsOpen.notifications}
            buttonClass={groupButtonClass}
            panelClass={groupPanelClass}
            shellClass={cn(innerShellBase, "bg-secondary-container/20")}
            onToggle={() => onGroupToggle("notifications")}
          >
            <SuperAdminLink href="/super-admin/notification-tests" icon={<TestTube2 className={sidebarSmallIconClass} />} label="اختبار إرسال الإشعارات" className={itemClass} onClose={onClose} />
            <SuperAdminLink href="/super-admin/notifications-broadcast" icon={<Megaphone className={sidebarSmallIconClass} />} label="بث إشعار لكل المستخدمين" className={itemClass} onClose={onClose} />
          </SuperAdminGroup>

          <SuperAdminGroup
            icon={<ShieldCheck className={sidebarSmallIconClass} />}
            label="النظام وحسابات المستخدمين"
            open={superAdminGroupsOpen.system}
            buttonClass={groupButtonClass}
            panelClass={groupPanelClass}
            shellClass={cn(innerShellBase, "bg-tertiary-container/15")}
            onToggle={() => onGroupToggle("system")}
          >
            <SuperAdminLink href="/super-admin/logs" icon={<ScrollText className={sidebarSmallIconClass} />} label="سجل أحداث النظام" className={itemClass} onClose={onClose} />
            <SuperAdminLink href="/super-admin/users" icon={<Users className={sidebarSmallIconClass} />} label="إدارة حسابات المستخدمين" className={itemClass} onClose={onClose} />
          </SuperAdminGroup>
        </div>
      )}
    </div>
  );
}

function SuperAdminGroup({
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
}) {
  return (
    <div className={shellClass}>
      <button type="button" onClick={onToggle} aria-expanded={open} className={buttonClass}>
        {icon}
        {label}
        <ChevronDown className={cn("ms-auto h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className={panelClass}>{children}</div>}
    </div>
  );
}

function SuperAdminLink({
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
}) {
  return (
    <Link href={href} onClick={onClose} className={className}>
      {icon}
      {label}
    </Link>
  );
}
