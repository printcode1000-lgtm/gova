'use client';

import * as React from 'react';
import { ShieldCheck, Lock, Truck, RefreshCw, Trophy, Star, Zap, Leaf, Crown, Palette, Globe, Flame, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TrustCredential, Achievement, SellerBadge } from '@/lib/merchant/types';
import { getAchievementRarityColor } from '@/lib/merchant/utils';

interface TrustCredibilityProps {
  credentials: TrustCredential[];
  achievements: Achievement[];
  badges: SellerBadge[];
  className?: string;
}

const credentialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck,
  Lock,
  Truck,
  RefreshCw,
};

const achievementIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  Star,
  Zap,
  Leaf,
};

const badgeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Crown,
  Palette,
  Globe,
  Flame,
};

export function TrustCredibility({
  credentials,
  achievements,
  badges,
  className,
}: TrustCredibilityProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-merchant-gold/10 p-2">
            <Award className="h-5 w-5 text-merchant-gold" />
          </div>
          <div>
            <CardTitle className="text-lg">Trust & Credibility</CardTitle>
            <CardDescription>Why shop with us</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trust Credentials */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {credentials.map((credential) => {
            const IconComponent = credentialIcons[credential.icon] || ShieldCheck;
            return (
              <div
                key={credential.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 transition-colors hover:bg-muted/50"
              >
                <div className="rounded-full bg-merchant-success/10 p-2">
                  <IconComponent className="h-4 w-4 text-merchant-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{credential.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {credential.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Achievements */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Achievements</h4>
          <div className="flex flex-wrap gap-2">
            {achievements.map((achievement) => {
              const IconComponent = achievementIcons[achievement.icon] || Trophy;
              return (
                <Badge
                  key={achievement.id}
                  variant="outline"
                  className={cn(
                    'gap-1.5 py-1.5 px-3 border',
                    getAchievementRarityColor(achievement.rarity)
                  )}
                >
                  <IconComponent className="h-3.5 w-3.5" />
                  <span className="font-medium">{achievement.name}</span>
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Seller Badges */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Seller Badges</h4>
          <div className="flex flex-wrap gap-2">
            {badges.filter((b) => b.earned).map((badge) => {
              const IconComponent = badgeIcons[badge.icon] || Crown;
              return (
                <Badge
                  key={badge.id}
                  className="gap-1.5 py-1.5 px-3 bg-merchant-gold/10 text-merchant-gold border border-merchant-gold/30"
                >
                  <IconComponent className="h-3.5 w-3.5" />
                  <span className="font-medium">{badge.name}</span>
                </Badge>
              );
            })}
            {badges.filter((b) => b.earned).length === 0 && (
              <span className="text-sm text-muted-foreground">No badges earned yet</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TrustCredibility;
