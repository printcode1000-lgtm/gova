'use client';

import { LogIn, Settings, UserPlus, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ isOpen, onClose }: AppSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { t, isRTL } = useTranslation();

  const sidebarLinks = [
    { href: '/login', icon: LogIn, label: t('sidebar.login') },
    { href: '/registration', icon: UserPlus, label: t('sidebar.register') },
    { href: '/settings', icon: Settings, label: t('sidebar.settings') },
  ] as const;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerOutside = (event: PointerEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerOutside);
    return () => document.removeEventListener('pointerdown', handlePointerOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 z-[60] ${isOpen ? '' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      <div
        className={cn(
          'absolute inset-0 gova-overlay-dim transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        ref={sidebarRef}
        role="dialog"
        aria-modal={isOpen}
        aria-label={t('sidebar.menu')}
        className={cn(
          'fixed top-0 inset-inline-start-0 z-[61] flex h-dvh w-72 flex-col border-e gova-drawer-panel transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'rtl:translate-x-full ltr:-translate-x-full',
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center justify-between p-3 gova-section-tonal-primary border-b border-outline-variant/30">
          <span className="text-sm font-semibold text-on-primary-container px-2">{t('sidebar.menu')}</span>
          <button
            type="button"
            className="gova-control-icon flex items-center justify-center rounded-full text-on-surface-variant active:opacity-80"
            onClick={onClose}
            aria-label={t('sidebar.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 pt-2">
          {sidebarLinks.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} onClick={onClose}>
              <button
                type="button"
                className="gova-control w-full flex items-center justify-start gap-3 rounded-lg text-sm font-medium text-on-surface gova-surface-neutral active:opacity-90"
              >
                <Icon className="w-5 h-5 shrink-0 text-primary" />
                {label}
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

