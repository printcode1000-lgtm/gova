'use client';

import { Bell, Heart, Home, Receipt } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useResolvedColorScheme } from '@/lib/preferences';
import { useNotificationBadge } from '@/features/notifications';
import { useFavorites } from '@/features/favorites';

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

    const publishHeight = () => {
      document.documentElement.style.setProperty('--asol-bottom-nav-space', `${nav.offsetHeight}px`);
    };

    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(nav);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--asol-bottom-nav-space');
    };
  }, []);

  const navItems = [
    { href: '/home', icon: Home, label: t('nav.home'), showBadge: false },
    { href: '/notifications', icon: Bell, label: t('nav.notifications'), showBadge: notificationBadge > 0, badgeCount: notificationBadge },
    { href: '/favorites', icon: Heart, label: t('nav.favorites'), showBadge: false },
    { href: '/orders', icon: Receipt, label: t('nav.orders'), showBadge: false },
  ];

  return (
    <nav
      ref={navRef}
      id="bottom-navigation-bar"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex min-h-12 items-center justify-around rounded-t-2xl border-t border-outline-variant pt-0 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] shadow-lg",
        resolvedScheme === 'dark' ? 'asol-surface-neutral' : 'bg-[#F8FBFF]'
      )}
    >
      {navItems.map(({ href, icon: Icon, label, showBadge, badgeCount }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        const favoriteHasItems = href === '/favorites' && favoriteCount > 0;

        return (
          <Link
            key={href}
            id={`nav-item-${href.slice(1)}`}
            href={href}
            className={cn(
              'relative flex min-w-[3.35rem] flex-col items-center justify-center rounded-2xl px-3 py-1.5 no-underline transition-all duration-200 active:scale-90',
              isActive
                ? 'asol-nav-pill-active shadow-sm ring-1 ring-primary/20'
                : resolvedScheme === 'dark'
                  ? 'text-on-surface-variant font-normal hover:bg-surface-container-high hover:text-on-surface'
                  : 'text-blue-700 font-normal hover:bg-blue-100/70 hover:text-blue-900'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              className={cn(
                "w-5 h-5 transition-transform duration-200",
                favoriteHasItems && "fill-current",
              )}
              style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)' }}
            />
            {showBadge && (
              <span className={cn(
                "absolute top-0 end-1/2 flex min-h-4 min-w-4 translate-x-4 items-center justify-center rounded-full border-2 bg-error px-1 text-[9px] font-bold leading-none text-on-error animate-pulse-subtle",
                resolvedScheme === 'dark' ? 'border-surface-bright' : 'border-blue-200'
              )}>
                {badgeCount && badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
            <span className="text-[10px] leading-3 font-semibold mt-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
