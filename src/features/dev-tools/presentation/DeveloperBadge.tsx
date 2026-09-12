'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { simulationActorUrl } from '@asol/simulation-core';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Switch } from '@/shared/ui/switch';
import { useSession } from '@/features/auth/ui';
import { isSuperAdmin } from '@/features/auth';
import { getSimulationState, setSimulationMode, type SimulationStateView } from '../application/simulation-api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { isDevelopment } from '@/core/config';
import { OVERLAY_CHROME_ATTRIBUTE } from '@/shared/ui/overlay-chrome';
import { OverlayChromeBranch } from '@/shared/ui/overlay-chrome-branch';
import { asolDbGet, asolDbSet, ASOL_DB_STORES } from '@asol/data-core/browser';

const pages = [
  { path: '/', name: 'شاشة البداية' },
  { path: '/dev/category-selector', name: 'محدد الأقسام' },
  { path: '/dev/monitor', name: 'مراقب العمليات' },
  { path: '/dev/catalog-studio', name: 'استوديو الكتالوج' },
  { path: '/dev/release-console', name: 'وحدة الإصدار' },
  { path: '/dev/deploy-all', name: 'تشغيل Deploy' },
  { path: '/dev/cloud-accounts', name: 'الحسابات السحابية' },
  { path: '/dev/notification-tests', name: 'اختبارات الإشعارات' },
];

const SPLASH_NAV_TOGGLE_KEY = 'asol-dev-splash-nav-toggle';

export function DeveloperBadge() {
  const pathname = usePathname();
  const { session, isLoading: sessionLoading } = useSession();
  const [simulationState, setSimulationState] = useState<SimulationStateView | null>(null);
  const [simulationBusy, setSimulationBusy] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSplashNavEnabled, setIsSplashNavEnabled] = useState(true);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionLoading || !isSuperAdmin(session)) {
      setSimulationState(null);
      return;
    }
    let active = true;
    void getSimulationState().then((next) => { if (active) setSimulationState(next); }).catch(() => { if (active) setSimulationState(null); });
    return () => { active = false; };
  }, [session?.uid, sessionLoading]);

  useEffect(() => {
    setIsMounted(true);
    setPosition({ x: 16, y: window.innerHeight - 60 });

    const loadSplashNav = async () => {
      const stored = await asolDbGet<boolean>(
        ASOL_DB_STORES.APP_SETTINGS,
        SPLASH_NAV_TOGGLE_KEY,
      );
      setIsSplashNavEnabled(stored !== false);
    };

    void loadSplashNav();
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: event.clientX - dragStartRef.current.x,
        y: event.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDragging) return;
      const touch = event.touches[0];
      setPosition({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      });
    };

    const handleTouchEnd = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const toggleSplashNav = async () => {
    const newValue = !isSplashNavEnabled;
    setIsSplashNavEnabled(newValue);
    await asolDbSet<boolean>(
      ASOL_DB_STORES.APP_SETTINGS,
      SPLASH_NAV_TOGGLE_KEY,
      newValue,
    );
  };

  const toggleSimulation = async (enabled: boolean) => {
    if (!session?.sessionToken || !isSuperAdmin(session) || simulationBusy) return;
    setSimulationBusy(true);
    try {
      const normalRoute = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const next = await setSimulationMode(enabled, session.sessionToken, enabled ? normalRoute : undefined);
      setSimulationState(next);
      if (enabled) {
        const admin = next.actors.find((actor) => actor.role === 'super-admin');
        if (!admin) throw new Error('simulationSuperAdminActorMissing');
        window.location.assign(simulationActorUrl(admin, admin.resumePath, window.location.hostname));
      }
    } catch (error) {
      console.error('[Simulation] Mode switch failed', error);
      setSimulationBusy(false);
    }
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  };

  if (!isDevelopment || !isMounted || (simulationState?.enabled && simulationState.actorKey)) {
    return null;
  }

  return (
    <OverlayChromeBranch id='features-dev-tools-presentation-developerbadge-overlaychromebranch-1-mzqzyw'
      ref={badgeRef}
      className="fixed z-[140] active:opacity-90"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <DropdownMenu>
        <DropdownMenuTrigger id='features-dev-tools-presentation-developerbadge-dropdownmenutrigger-2-asp9tl' asChild>
          <Badge id='features-dev-tools-presentation-developerbadge-badge-3-bfomff' variant="destructive" className="pointer-events-auto">
            ASOL DEV
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-64 max-h-[80vh] overflow-y-auto"
          {...{ [OVERLAY_CHROME_ATTRIBUTE]: 'true' }}
        >
          <DropdownMenuLabel id='features-dev-tools-presentation-developerbadge-dropdownmenulabel-4-yt2lba'>صفحات المشروع</DropdownMenuLabel>
          {isSuperAdmin(session) ? (
            <div id="features-dev-tools-presentation-developerbadge-div-6-sim001" className="flex items-center justify-between gap-3 px-2 py-2">
              <div id="features-dev-tools-presentation-developerbadge-div-7-sim002" className="min-w-0">
                <div id="features-dev-tools-presentation-developerbadge-div-8-sim003" className="text-sm font-semibold">محاكاة الحسابات</div>
                <div id="features-dev-tools-presentation-developerbadge-div-9-sim004" className="text-[11px] text-muted-foreground">{simulationState?.runtimeAvailable ? '10 حسابات حقيقية معزولة' : 'تحتاج npm run dev'}</div>
              </div>
              <Switch
                checked={simulationState?.enabled === true}
                disabled={!simulationState?.runtimeAvailable || simulationBusy}
                onCheckedChange={(checked) => void toggleSimulation(checked)}
                aria-label="وضع محاكاة الحسابات"
              />
            </div>
          ) : null}
          <DropdownMenuSeparator id='features-dev-tools-presentation-developerbadge-dropdownmenuseparator-5-zdzvtx' />
          {pages.map((page) => (
            <div key={page.path} className="flex items-center justify-between px-2">
              <DropdownMenuItem asChild className="flex-1">
                <Link href={page.path} className={pathname === page.path ? 'bg-accent' : ''}>
                  {page.name}
                </Link>
              </DropdownMenuItem>
              {page.path === '/' && (
                <Button
                  variant={isSplashNavEnabled ? 'default' : 'destructive'}
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    void toggleSplashNav();
                  }}
                  className="ml-2 h-7 min-h-7 text-xs px-2"
                >
                  {isSplashNavEnabled ? 'ON' : 'OFF'}
                </Button>
              )}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </OverlayChromeBranch>
  );
}
