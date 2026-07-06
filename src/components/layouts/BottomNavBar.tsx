'use client';

import { Bell, Heart, Home, Receipt } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

export function BottomNavBar() {
  const navRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const { t } = useTranslation();

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const publishHeight = () => {
      document.documentElement.style.setProperty('--gova-bottom-nav-space', `${nav.offsetHeight}px`);
    };

    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(nav);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--gova-bottom-nav-space');
    };
  }, []);

  const navItems = [
    { href: '/home', icon: Home, label: t('nav.home'), showBadge: false },
    { href: '/notifications', icon: Bell, label: t('nav.notifications'), showBadge: true },
    { href: '/favorites', icon: Heart, label: t('nav.favorites'), showBadge: false },
    { href: '/orders', icon: Receipt, label: t('nav.orders'), showBadge: false },
  ];

  return (
    <nav
      ref={navRef}
      id="bottom-navigation-bar"
      className="gova-surface-neutral fixed inset-x-0 bottom-0 z-50 flex min-h-16 items-center justify-around rounded-t-2xl border-t border-outline-variant pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-lg"
    >
      {navItems.map(({ href, icon: Icon, label, showBadge }) => {
        const isActive = pathname === href;

        return (
          <Link
            key={href}
            id={`nav-item-${href.slice(1)}`}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center relative py-1 px-2 min-w-[3rem] transition-transform active:scale-90 no-underline',
              isActive ? 'gova-nav-pill-active font-bold' : 'text-on-surface-variant font-normal',
            )}
          >
            <Icon
              className="w-5 h-5 transition-transform duration-200"
              style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)' }}
            />
            {showBadge && (
              <span className="absolute top-0 end-1/2 translate-x-3 w-2.5 h-2.5 rounded-full border-2 border-surface-bright bg-error animate-pulse-subtle" />
            )}
            <span className="text-[10px] leading-3 font-semibold mt-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
