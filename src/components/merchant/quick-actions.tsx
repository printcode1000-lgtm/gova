'use client';

import * as React from 'react';
import { Plus, Package, ShoppingBag, MessageSquare, BarChart3, Megaphone, Warehouse } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { QuickAction as QuickActionType } from '@/lib/merchant/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Plus,
  Package,
  ShoppingBag,
  MessageSquare,
  BarChart3,
  Megaphone,
  Warehouse,
};

interface QuickActionsProps {
  actions: QuickActionType[];
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <section className={cn('', className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {actions.map((action) => {
          const IconComponent = iconMap[action.icon] || Package;
          const isPrimary = action.variant === 'primary';

          return (
            <Card
              key={action.id}
              className={cn(
                'group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg',
                isPrimary && 'border-primary/30 bg-primary/5'
              )}
            >
              <CardContent className="flex flex-col items-center justify-center p-4">
                <div
                  className={cn(
                    'relative mb-3 rounded-full p-2.5 transition-colors',
                    isPrimary
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted group-hover:bg-primary/10'
                  )}
                >
                  <IconComponent
                    className={cn(
                      'h-5 w-5',
                      isPrimary
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground group-hover:text-primary'
                    )}
                  />
                  {action.badge !== undefined && action.badge > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1.5 text-xs"
                    >
                      {action.badge > 99 ? '99+' : action.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export default QuickActions;
