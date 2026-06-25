'use client';

import * as React from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Order } from '@/lib/merchant/types';
import { formatCurrency, formatRelativeTime, getOrderStatusColor } from '@/lib/merchant/utils';

interface RecentOrdersProps {
  orders: Order[];
  className?: string;
}

export function RecentOrders({ orders, className }: RecentOrdersProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <div className="gova-merchant-icon-well-secondary">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Recent Orders</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-sm">
          View All
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
            >
              {/* Customer Avatar */}
              <Avatar className="h-10 w-10">
                <AvatarImage src={order.customer.avatar} alt={order.customer.name} />
                <AvatarFallback>
                  {order.customer.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </AvatarFallback>
              </Avatar>

              {/* Order Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {order.customer.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {order.items} item{order.items > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {order.id}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(order.createdAt)}
                  </span>
                </div>
              </div>

              {/* Order Value & Status */}
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="font-semibold text-sm">
                  {formatCurrency(order.value)}
                </span>
                <Badge
                  variant="secondary"
                  className={cn('capitalize', getOrderStatusColor(order.status))}
                >
                  {order.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default RecentOrders;
