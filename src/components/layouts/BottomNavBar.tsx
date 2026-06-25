'use client';

import { Bell, Heart, Home, Receipt, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

export function BottomNavBar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { href: '/home', icon: Home, label: t('nav.home'), showBadge: false },
    { href: '/notifications', icon: Bell, label: t('nav.notifications'), showBadge: true },
    { href: '/favorites', icon: Heart, label: t('nav.favorites'), showBadge: false },
    { href: '/orders', icon: Receipt, label: t('nav.orders'), showBadge: false },
    { href: '/profile', icon: User, label: t('nav.profile'), showBadge: false },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 inset-x-0 z-50 flex justify-around items-center pt-2 pb-4 border-t border-outline-variant rounded-t-2xl shadow-lg gova-surface-neutral"
    >
      {navItems.map(({ href, icon: Icon, label, showBadge }) => {
        const isActive = pathname === href;

        return (
          <Link
            key={href}
            id={`nav-item-${href.slice(1)}`}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center relative py-1.5 px-3 min-w-[3.5rem] transition-transform active:scale-90 no-underline',
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
            <span className="text-xs leading-4 font-semibold mt-0.5">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
