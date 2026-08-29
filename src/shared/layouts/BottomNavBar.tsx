'use client';

import { Bell, Heart, Home, Receipt } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

import { cn } from '@/shared/utils';
import { useTranslation } from '@/shared/i18n';
import { useResolvedColorScheme } from '@/shared/preferences';
import { useNotificationBadge } from '@/features/notifications/ui';
import { useFavorites } from '@/features/favorites';
import { uiAttributes, type UiDescriptor } from '@asol/ui-registry-core';

/**
 * Each tab is registered explicitly so its uid stays stable no matter how the
 * route list is ordered, translated, or re-rendered.
 */
const NAV_ITEM_UI = {
  home: { uid: 'app.bottom-nav.home-X9BdD9', id: 'app.bottom-nav.home', kind: 'action', action: 'navigate-home', part: 'item' },
  notifications: { uid: 'app.bottom-nav.notifications-3tXfie', id: 'app.bottom-nav.notifications', kind: 'action', action: 'navigate-notifications', part: 'item' },
  favorites: { uid: 'app.bottom-nav.favorites-41rYgS', id: 'app.bottom-nav.favorites', kind: 'action', action: 'navigate-favorites', part: 'item', interaction: { type: 'tap' }, simulation: { kind: 'event', id: 'nav-favorites' } },
  orders: { uid: 'app.bottom-nav.orders-t7L2as', id: 'app.bottom-nav.orders', kind: 'action', action: 'navigate-orders', part: 'item' },
} as const satisfies Record<string, UiDescriptor>;

export function BottomNavBar() {
  const navRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const { t } = useTranslation();
  const resolvedScheme = useResolvedColorScheme();
  const notificationBadge = useNotificationBadge();
  const { totalCount: favoriteCount } = useFavorites();

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const root = document.documentElement;

    // Written synchronously: a requestAnimationFrame callback never runs while
    // the document is hidden, which would leave pages without bottom clearance.
    const publishHeight = () => {
      root.style.setProperty('--asol-bottom-nav-space', `${nav.offsetHeight}px`);
    };

    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(nav);

    return () => {
      observer.disconnect();
      root.style.removeProperty('--asol-bottom-nav-space');
    };
  }, []);

  const navItems = [
    { href: '/home', icon: Home, label: t('nav.home'), showBadge: false, ui: NAV_ITEM_UI.home },
    { href: '/notifications', icon: Bell, label: t('nav.notifications'), showBadge: notificationBadge > 0, badgeCount: notificationBadge, ui: NAV_ITEM_UI.notifications },
    { href: '/favorites', icon: Heart, label: t('nav.favorites'), showBadge: false, ui: NAV_ITEM_UI.favorites },
    { href: '/orders', icon: Receipt, label: t('nav.orders'), showBadge: false, ui: NAV_ITEM_UI.orders },
  ];

  return (
    <nav
      {...uiAttributes({ uid: 'app.bottom-nav-BI6bI8', id: 'app.bottom-nav', kind: 'region', part: 'bottom' })}
      ref={navRef}
      id="bottom-navigation-bar"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex min-h-12 items-center justify-around rounded-t-2xl border-t border-outline-variant pt-0 pb-[calc(0.25rem+var(--asol-safe-area-bottom))] shadow-lg",
        resolvedScheme === 'dark' ? 'asol-surface-neutral' : 'bg-[#F8FBFF]'
      )}
    >
      {navItems.map(({ href, icon: Icon, label, showBadge, badgeCount, ui }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        const favoriteHasItems = href === '/favorites' && favoriteCount > 0;

        return (
          <Link
            key={href}
            {...uiAttributes(ui)}
            id={`nav-item-${href.slice(1)}`}
            href={href}
            className={cn(
              'relative flex min-w-[2.2rem] flex-col items-center justify-center rounded-2xl px-2 py-0.5 no-underline transition-all duration-200 active:scale-90',
              isActive
                ? 'asol-nav-pill-active shadow-sm ring-1 ring-primary/20'
                : resolvedScheme === 'dark'
                  ? 'text-primary font-normal'
                  : 'text-blue-900 font-normal'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              key="icon"
              className={cn(
                "w-5 h-5 transition-transform duration-200",
                favoriteHasItems && "fill-current",
              )}
              style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)' }}
            />
            {showBadge && (
              <span key="badge" {...uiAttributes({ uid: "shared.layouts.bottom-nav-bar.span-vFC7Nf", id: "shared.layouts.bottom-nav-bar.span" })} className={cn(
                "absolute top-0 end-1/2 flex min-h-4 min-w-4 translate-x-4 items-center justify-center rounded-full border-2 bg-error px-1 text-[9px] font-bold leading-none text-on-error animate-pulse-subtle",
                resolvedScheme === 'dark' ? 'border-surface-bright' : 'border-blue-200'
              )}>
                {badgeCount && badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
            <span key="label" {...uiAttributes({ uid: "shared.layouts.bottom-nav-bar.span.2-PUBJ7K", id: "shared.layouts.bottom-nav-bar.span.2" })} className="text-[10px] leading-3 font-semibold mt-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
