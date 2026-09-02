import Link from "next/link";
import {
  ChevronDown,
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

export function AppSidebarSuperAdminSection({ id,
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
} & { id?: string }) {
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
    <div id={id ? `${id}-div-1-43jwkc` : undefined}
      className={cn(
        "asol-control overflow-hidden rounded-2xl border",
        resolvedScheme === "dark"
          ? "border-outline-variant/30"
          : "border-outline-variant/20",
        sidebarSurface,
      )}
    >
      <button id={id ? `${id}-button-2-o1wgsz` : undefined}
        type="button"
        onClick={onToggle}
        aria-expanded={superAdminOpen}
        className={cn(sidebarControlClass, "rounded-none")}
      >
        <ShieldCheck id='shared-layouts-app-sidebar-appsidebarsuperadminsection-shieldcheck-3-qp2gdt' className={sidebarIconClass} aria-hidden />
        <span id={id ? `${id}-text-4-8ur8tw` : undefined} className="min-w-0 flex-1">لوحة تحكم السوبر أدمن</span>
        <ChevronDown id='shared-layouts-app-sidebar-appsidebarsuperadminsection-chevrondown-5-ibquvl'
          aria-hidden
          className={cn(
            "ms-auto h-4 w-4 shrink-0 transition-transform",
            superAdminOpen && "rotate-180",
          )}
        />
      </button>
      {superAdminOpen && (
        <div id={id ? `${id}-div-6-cmtnrx` : undefined} className="space-y-2 px-2 pb-3 sm:px-3 sm:pe-3 sm:ps-11">
          <SuperAdminGroup id={id ? `${id}-super-admin-group-0d9121` : undefined}
            icon={<Sliders id='shared-layouts-app-sidebar-appsidebarsuperadminsection-sliders-8-bokikg' className={sidebarSmallIconClass} />}
            label="واجهة المتجر والعروض"
            open={superAdminGroupsOpen.content}
            buttonClass={groupButtonClass}
            panelClass={groupPanelClass}
            shellClass={cn(innerShellBase, superAdminInnerSurface("content"))}
            onToggle={() => onGroupToggle("content")}
          >
            <SuperAdminLink id='shared-layouts-app-sidebar-appsidebarsuperadminsection-superadminlink-9-h0cjip' href="/super-admin/hero-slider" icon={<Sliders id='shared-layouts-app-sidebar-appsidebarsuperadminsection-sliders-10-zmpoyj' className={sidebarSmallIconClass} />} label="سلايدر الواجهة الرئيسية" className={itemClass} onClose={onClose} />
            <SuperAdminLink id='shared-layouts-app-sidebar-appsidebarsuperadminsection-superadminlink-11-woazrn' href="/super-admin/featured-marquee" icon={<Sparkles id='shared-layouts-app-sidebar-appsidebarsuperadminsection-sparkles-12-tz4sbu' className={sidebarSmallIconClass} />} label="شريط المنتجات المميزة" className={itemClass} onClose={onClose} />
            <SuperAdminLink id='shared-layouts-app-sidebar-appsidebarsuperadminsection-superadminlink-13-v5h8tk' href="/super-admin/trending-ribbon" icon={<TrendingUp id='shared-layouts-app-sidebar-appsidebarsuperadminsection-trendingup-14-aveimh' className={sidebarSmallIconClass} />} label="الشريط الإخباري المتحرك" className={itemClass} onClose={onClose} />
          </SuperAdminGroup>

          <SuperAdminGroup id={id ? `${id}-super-admin-group-3ed339` : undefined}
            icon={<Megaphone id='shared-layouts-app-sidebar-appsidebarsuperadminsection-megaphone-16-1cbw5p' className={sidebarSmallIconClass} />}
            label="الإشعارات والبث"
            open={superAdminGroupsOpen.notifications}
            buttonClass={groupButtonClass}
            panelClass={groupPanelClass}
            shellClass={cn(innerShellBase, superAdminInnerSurface("notifications"))}
            onToggle={() => onGroupToggle("notifications")}
          >
            <SuperAdminLink id='shared-layouts-app-sidebar-appsidebarsuperadminsection-superadminlink-17-iqwe7u' href="/super-admin/notifications-broadcast" icon={<Megaphone id='shared-layouts-app-sidebar-appsidebarsuperadminsection-megaphone-18-p3th3t' className={sidebarSmallIconClass} />} label="بث إشعار لكل المستخدمين" className={itemClass} onClose={onClose} />
          </SuperAdminGroup>

          <SuperAdminGroup id={id ? `${id}-super-admin-group-a551a0` : undefined}
            icon={<ShieldCheck id='shared-layouts-app-sidebar-appsidebarsuperadminsection-shieldcheck-20-jgkpfx' className={sidebarSmallIconClass} />}
            label="النظام وحسابات المستخدمين"
            open={superAdminGroupsOpen.system}
            buttonClass={groupButtonClass}
            panelClass={groupPanelClass}
            shellClass={cn(innerShellBase, superAdminInnerSurface("system"))}
            onToggle={() => onGroupToggle("system")}
          >
            <SuperAdminLink id='shared-layouts-app-sidebar-appsidebarsuperadminsection-superadminlink-21-rhcexx' href="/super-admin/logs" icon={<ScrollText id='shared-layouts-app-sidebar-appsidebarsuperadminsection-scrolltext-22-fqhqrr' className={sidebarSmallIconClass} />} label="سجل أحداث النظام" className={itemClass} onClose={onClose} />
            <SuperAdminLink id='shared-layouts-app-sidebar-appsidebarsuperadminsection-superadminlink-23-qkrf53' href="/super-admin/users" icon={<Users id='shared-layouts-app-sidebar-appsidebarsuperadminsection-users-24-pxsp4d' className={sidebarSmallIconClass} />} label="إدارة حسابات المستخدمين" className={itemClass} onClose={onClose} />
            <SuperAdminLink id='shared-layouts-app-sidebar-appsidebarsuperadminsection-superadminlink-25-ynaysy' href="/super-admin/production-deploy" icon={<Rocket id='shared-layouts-app-sidebar-appsidebarsuperadminsection-rocket-26-epfdyj' className={sidebarSmallIconClass} />} label="النشر إلى الإنتاج" className={itemClass} onClose={onClose} />
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
      <button id={id ? `${id}-button-28-t8jqrv` : undefined} type="button" onClick={onToggle} aria-expanded={open} className={buttonClass}>
        {icon}
        {label}
        <ChevronDown className={cn("ms-auto h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div id={id ? `${id}-div-29-adtxck` : undefined} className={panelClass}>{children}</div>}
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
