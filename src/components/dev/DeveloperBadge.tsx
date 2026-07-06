'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { govaDbGet, govaDbSet, GOVA_DB_STORES } from '@/lib/gova-db';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fillRegistrationForm } from '@/lib/autofill/registration-autofill';
import { fillLoginForm } from '@/lib/autofill/login-autofill';
import { fillOnboardingRandomFixture } from '@/lib/autofill/onboarding-autofill';
import { isDevelopment } from '@/core/config';

const pages = [
  { path: '/', name: 'Splash' },
  { path: '/home', name: 'Home' },
  { path: '/login', name: 'Login' },
  { path: '/registration', name: 'Registration' },
  { path: '/forgot-password', name: 'Forgot Password' },
  { path: '/profile', name: 'Profile' },
  { path: '/settings', name: 'Settings' },
  { path: '/favorites', name: 'Favorites' },
  { path: '/notifications', name: 'Notifications' },
  { path: '/orders', name: 'Orders' },
  { path: '/seller', name: 'Seller' },
  { path: '/addseller', name: 'Add Seller' },
  { path: '/test1', name: 'Test1' },
  { path: '/dev/category-selector', name: 'Category Selector' },
  { path: '/dev/monitor', name: 'Operation Monitor' },
];

const marketplaceOrdersPages = [
  {
    path: '/marketplace-orders',
    name: 'لوحة التحكم',
    role: 'عام',
    desc: 'فهرس جميع صفحات إدارة الطلبات في السوق.',
  },
  {
    path: '/marketplace-orders/buyer-cart-checkout',
    name: 'سلة المشتري وإتمام الطلب',
    role: 'مشتري',
    desc: 'مراجعة السلة واختيار الشحن والدفع وتأكيد الطلب.',
  },
  {
    path: '/marketplace-orders/create-custom-request',
    name: 'إنشاء طلب مخصص',
    role: 'مشتري',
    desc: 'إنشاء طلب مخصص بوصف وصور لطلبات الصيدلية أو السوبرماركت أو الخدمات.',
  },
  {
    path: '/marketplace-orders/my-orders',
    name: 'طلباتي',
    role: 'مشتري',
    desc: 'عرض جميع الطلبات مع البحث والتصفية والوصول السريع للتفاصيل.',
  },
  {
    path: '/marketplace-orders/buyer-order-details',
    name: 'تفاصيل طلب المشتري',
    role: 'مشتري',
    desc: 'عرض التسلسل الكامل للطلب: البائعين، المنتجات، الشحنات، الدفع، والنزاعات.',
  },
  {
    path: '/marketplace-orders/custom-request-price-offer',
    name: 'عرض سعر الطلب المخصص',
    role: 'مشتري',
    desc: 'مراجعة عرض سعر البائع لطلب مخصص وقبوله أو رفضه.',
  },
  {
    path: '/marketplace-orders/shipment-tracking',
    name: 'تتبع الشحنة',
    role: 'مشتري',
    desc: 'تتبع الشحنات المستقلة وتحديثات الناقل والمنتجات داخل كل شحنة.',
  },
  {
    path: '/marketplace-orders/cancel-order-items',
    name: 'إلغاء الطلب أو المنتجات',
    role: 'مشتري',
    desc: 'إلغاء الطلب كاملاً أو منتجات أو طلبات مخصصة محددة عند الأهلية.',
  },
  {
    path: '/marketplace-orders/return-replace-items',
    name: 'إرجاع أو استبدال المنتجات',
    role: 'مشتري',
    desc: 'تقديم طلبات إرجاع أو استبدال للمنتجات المسلّمة المؤهلة ومتابعة تقدمها.',
  },
  {
    path: '/marketplace-orders/open-view-dispute',
    name: 'فتح أو عرض نزاع',
    role: 'مشتري',
    desc: 'فتح نزاع، تبادل الرسائل مع البائع أو الناقل، وعرض القرار الإداري.',
  },
  {
    path: '/marketplace-orders/seller-orders',
    name: 'طلبات البائع',
    role: 'بائع',
    desc: 'عرض وإدارة جميع الطلبات المعينة للبائع وحالة الإنجاز والملخص المالي.',
  },
  {
    path: '/marketplace-orders/seller-order-details',
    name: 'تفاصيل طلب البائع',
    role: 'بائع',
    desc: 'إدارة حصة البائع فقط من الطلب: المنتجات، التسعير، والتجهيز للشحن.',
  },
  {
    path: '/marketplace-orders/seller-custom-requests',
    name: 'الطلبات المخصصة للبائع',
    role: 'بائع / مزود خدمة',
    desc: 'مراجعة الطلبات المخصصة المستندة إلى الصور وإدارة سير العمل للتسعير.',
  },
  {
    path: '/marketplace-orders/send-custom-request-price-offer',
    name: 'إرسال عرض سعر مخصص',
    role: 'بائع / مزود خدمة',
    desc: 'إعداد وإرسال عرض سعر مفصّل مع تكاليف الشحن ومتطلبات النقل.',
  },
  {
    path: '/marketplace-orders/prepare-items-shipping',
    name: 'تجهيز المنتجات للشحن',
    role: 'بائع / مزود خدمة',
    desc: 'إدارة المنتجات المقبولة وتحديث التقدم وتحديد الجاهزية للشحن.',
  },
  {
    path: '/marketplace-orders/assigned-shipments',
    name: 'الشحنات المعينة',
    role: 'ناقل',
    desc: 'عرض جميع الشحنات المعينة للناقل مع الملخصات وتقدم التسليم.',
  },
  {
    path: '/marketplace-orders/carrier-shipment-details',
    name: 'تفاصيل شحنة الناقل',
    role: 'ناقل',
    desc: 'إدارة تنفيذ الشحنة وتحديث الحالات ومعالجة أحداث التسليم.',
  },
  {
    path: '/marketplace-orders/admin-orders-dashboard',
    name: 'لوحة طلبات المسؤول',
    role: 'مسؤول',
    desc: 'مراقبة جميع الطلبات، مراجعة الإحصاءات، والفلترة وإدارة الطلبات.',
  },
  {
    path: '/marketplace-orders/admin-full-order-details',
    name: 'تفاصيل الطلب الكاملة',
    role: 'مسؤول',
    desc: 'عرض دورة حياة الطلب الكاملة: المشترين، البائعين، الشحنات، المدفوعات، والنزاعات.',
  },
  {
    path: '/marketplace-orders/admin-disputes',
    name: 'نزاعات المسؤول',
    role: 'مسؤول',
    desc: 'مراجعة وإدارة وحل النزاعات بين المشترين والبائعين والناقلين.',
  },
  {
    path: '/marketplace-orders/audit-trail',
    name: 'سجل التدقيق',
    role: 'مسؤول',
    desc: 'عرض التاريخ الزمني الكامل لجميع الإجراءات وتغييرات الحالة والعمليات الإدارية.',
  },
];

const roleColor: Record<string, string> = {
  'مشتري': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'بائع': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  'بائع / مزود خدمة': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  'ناقل': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  'مسؤول': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  'عام': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

const SPLASH_NAV_TOGGLE_KEY = 'gova-dev-splash-nav-toggle';

export function DeveloperBadge() {
  const pathname = usePathname();
  const [position, setPosition] = useState({ x: 16, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSplashNavEnabled, setIsSplashNavEnabled] = useState(true);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    setPosition({ x: 16, y: window.innerHeight - 60 });
    const loadSplashNav = async () => {
      const stored = await govaDbGet<boolean>(GOVA_DB_STORES.APP_SETTINGS, SPLASH_NAV_TOGGLE_KEY);
      setIsSplashNavEnabled(stored !== false);
    };
    void loadSplashNav();
  }, []);

  const toggleSplashNav = async () => {
    const newValue = !isSplashNavEnabled;
    setIsSplashNavEnabled(newValue);
    await govaDbSet<boolean>(GOVA_DB_STORES.APP_SETTINGS, SPLASH_NAV_TOGGLE_KEY, newValue);
  };

  const handleAutofill = async () => {
    if (pathname === '/registration') {
      const result = await fillRegistrationForm();
      console.log('[Autofill Registration]:', result);
    } else if (pathname === '/login') {
      const result = await fillLoginForm();
      console.log('[Autofill Login]:', result);
    } else if (pathname === '/addseller') {
      const result = fillOnboardingRandomFixture();
      console.log('[Autofill AddSeller]:', result);
    } else {
      console.log('[Autofill] Not available on this page');
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  };

  if (!isDevelopment || !isMounted) {
    return null;
  }

  return (
    <div
      ref={badgeRef}
      className="fixed z-50 cursor-grab active:cursor-grabbing"
      style={{
        left: position.x,
        top: position.y,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Badge
            variant="destructive"
            className="select-none pointer-events-auto"
          >
            GOVA DEV
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 max-h-[80vh] overflow-y-auto">
          <DropdownMenuLabel>صفحات المشروع</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {pages.map((page) => (
            <div key={page.path} className="flex items-center justify-between px-2">
              <DropdownMenuItem asChild className="flex-1">
                <Link
                  href={page.path}
                  className={pathname === page.path ? 'bg-accent' : ''}
                >
                  {page.name}
                </Link>
              </DropdownMenuItem>
              {page.path === '/' && (
                <Button
                  variant={isSplashNavEnabled ? 'default' : 'destructive'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSplashNav();
                  }}
                  className="ml-2 h-7 min-h-7 text-xs px-2"
                >
                  {isSplashNavEnabled ? 'ON' : 'OFF'}
                </Button>
              )}
            </div>
          ))}

          <DropdownMenuSeparator />
          <div
            className="flex items-center justify-between px-2 py-1.5 cursor-pointer select-none hover:bg-accent rounded-sm"
            onClick={(e) => { e.stopPropagation(); setIsMarketplaceOpen((v) => !v); }}
          >
            <span className="text-sm font-semibold">Marketplace Orders</span>
            <span className="text-xs text-muted-foreground ml-1">{isMarketplaceOpen ? '▲' : '▼'}</span>
          </div>
          {isMarketplaceOpen && (
            <>
              <DropdownMenuSeparator />
              {marketplaceOrdersPages.map((page) => (
                <DropdownMenuItem key={page.path} asChild>
                  <Link
                    href={page.path}
                    className={`flex flex-col items-start gap-0.5 py-2 ${pathname === page.path ? 'bg-accent' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full gap-1">
                      <span className="text-sm font-medium leading-tight">{page.name}</span>
                      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleColor[page.role] ?? ''}`}>
                        {page.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground leading-snug whitespace-normal">{page.desc}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleAutofill}>
            ملء النموذج تلقائياً
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
