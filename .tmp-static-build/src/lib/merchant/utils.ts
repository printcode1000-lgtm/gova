import type { OrderStatus, StockStatus, InventoryHealth, MerchantStatus } from './types';

export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function getOrderStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    pending: 'bg-merchant-warning text-merchant-warning-foreground',
    processing: 'bg-merchant-info text-merchant-info-foreground',
    shipped: 'bg-secondary text-secondary-foreground',
    delivered: 'bg-merchant-success text-merchant-success-foreground',
    cancelled: 'bg-destructive text-destructive-foreground',
  };
  return colors[status];
}

export function getStockStatusColor(status: StockStatus): string {
  const colors: Record<StockStatus, string> = {
    in_stock: 'text-merchant-success',
    low_stock: 'text-merchant-warning',
    out_of_stock: 'text-destructive',
  };
  return colors[status];
}

export function getInventoryHealthColor(health: InventoryHealth): string {
  const colors: Record<InventoryHealth, string> = {
    healthy: 'text-merchant-success',
    low_stock: 'text-merchant-warning',
    out_of_stock: 'text-destructive',
  };
  return colors[health];
}

export function getMerchantStatusColor(status: MerchantStatus): string {
  const colors: Record<MerchantStatus, string> = {
    active: 'bg-merchant-success',
    away: 'bg-merchant-warning',
    offline: 'bg-muted-foreground',
  };
  return colors[status];
}

export function getAchievementRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: 'border-border bg-muted',
    rare: 'border-merchant-info bg-merchant-info/10',
    epic: 'border-merchant-gold bg-merchant-gold/10',
    legendary: 'border-merchant-gold bg-merchant-gold/20',
  };
  return colors[rarity] || colors.common;
}

export function calculateRatingPercentage(distribution: { five: number; four: number; three: number; two: number; one: number }, star: number): number {
  const total = distribution.five + distribution.four + distribution.three + distribution.two + distribution.one;
  if (total === 0) return 0;
  const counts: Record<number, number> = {
    5: distribution.five,
    4: distribution.four,
    3: distribution.three,
    2: distribution.two,
    1: distribution.one,
  };
  return (counts[star] / total) * 100;
}

export function generateStars(rating: number): { filled: number; half: boolean; empty: number } {
  const filled = Math.floor(rating);
  const half = rating - filled >= 0.5;
  const empty = 5 - filled - (half ? 1 : 0);
  return { filled, half, empty };
}
