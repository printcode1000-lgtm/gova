'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingBag, Target, Package, Award, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PerformanceMetrics } from '@/lib/merchant/types';
import { formatCurrency, getInventoryHealthColor } from '@/lib/merchant/utils';

interface PerformanceDashboardProps {
  performance: PerformanceMetrics;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconVariant?: 'default' | 'success' | 'warning' | 'info';
}

function MetricCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  iconVariant = 'default',
}: MetricCardProps) {
  const iconColors = {
    default: 'bg-muted',
    success: 'bg-merchant-success/10',
    warning: 'bg-merchant-warning/10',
    info: 'bg-merchant-info/10',
  };

  const iconTextColors = {
    default: 'text-muted-foreground',
    success: 'text-merchant-success',
    warning: 'text-merchant-warning',
    info: 'text-merchant-info',
  };

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className="flex items-center gap-1">
                {trend === 'up' && <TrendingUp className="h-3 w-3 text-merchant-success" />}
                {trend === 'down' && <TrendingDown className="h-3 w-3 text-destructive" />}
                {trend === 'neutral' && <Minus className="h-3 w-3 text-muted-foreground" />}
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend === 'up' && 'text-merchant-success',
                    trend === 'down' && 'text-destructive',
                    trend === 'neutral' && 'text-muted-foreground'
                  )}
                >
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'rounded-full p-2.5',
              iconColors[iconVariant]
            )}
          >
            <Icon className={cn('h-5 w-5', iconTextColors[iconVariant])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PerformanceDashboard({ performance, className }: PerformanceDashboardProps) {
  const inventoryHealthPercent =
    performance.inventoryHealth === 'healthy'
      ? 100
      : performance.inventoryHealth === 'low_stock'
      ? 60
      : 20;

  return (
    <section className={cn('', className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Performance Dashboard</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Revenue Today */}
        <MetricCard
          title="Revenue Today"
          value={formatCurrency(performance.revenueToday)}
          subtitle="Total sales today"
          trend="up"
          trendValue="+12.5%"
          icon={DollarSign}
          iconVariant="success"
        />

        {/* Revenue This Month */}
        <MetricCard
          title="Revenue This Month"
          value={formatCurrency(performance.revenueThisMonth)}
          subtitle="Monthly performance"
          trend="up"
          trendValue="+8.3% vs last month"
          icon={TrendingUp}
          iconVariant="success"
        />

        {/* Orders Today */}
        <MetricCard
          title="Orders Today"
          value={performance.ordersToday}
          subtitle="New orders"
          trend="up"
          trendValue="+5"
          icon={ShoppingBag}
        />

        {/* Orders This Month */}
        <MetricCard
          title="Orders This Month"
          value={performance.ordersThisMonth}
          subtitle="Monthly orders"
          trend="up"
          trendValue="+15.2%"
          icon={Package}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Conversion Rate */}
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold tracking-tight">{performance.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Visitors to buyers</p>
              </div>
              <div className="rounded-full bg-merchant-info/10 p-2.5">
                <Target className="h-5 w-5 text-merchant-info" />
              </div>
            </div>
            <Progress value={performance.conversionRate * 10} className="mt-4 h-2" />
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Average Order Value</p>
                <p className="text-2xl font-bold tracking-tight">
                  {formatCurrency(performance.averageOrderValue)}
                </p>
                <p className="text-xs text-muted-foreground">Per transaction</p>
              </div>
              <div className="rounded-full bg-merchant-gold/10 p-2.5">
                <Award className="h-5 w-5 text-merchant-gold" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Best Selling Category */}
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Best Selling Category</p>
                <p className="text-lg font-bold tracking-tight">
                  {performance.bestSellingCategory}
                </p>
                <p className="text-xs text-muted-foreground">Top performer this month</p>
              </div>
              <div className="gova-merchant-icon-well-tertiary p-2.5">
                <Award className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Health */}
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Inventory Health</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold tracking-tight capitalize">
                    {performance.inventoryHealth.replace('_', ' ')}
                  </p>
                  {performance.inventoryHealth !== 'healthy' && (
                    <AlertTriangle className="h-5 w-5 text-merchant-warning" />
                  )}
                </div>
              </div>
              <Badge
                variant={performance.inventoryHealth === 'healthy' ? 'default' : 'destructive'}
                className="capitalize"
              >
                {performance.inventoryHealth.replace('_', ' ')}
              </Badge>
            </div>
            <Progress
              value={inventoryHealthPercent}
              className={cn(
                'mt-4 h-2',
                performance.inventoryHealth === 'healthy' && '[&>div]:bg-merchant-success',
                performance.inventoryHealth === 'low_stock' && '[&>div]:bg-merchant-warning'
              )}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export default PerformanceDashboard;
