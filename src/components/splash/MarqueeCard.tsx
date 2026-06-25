import type { LucideIcon } from 'lucide-react';

interface MarqueeCardProps {
  icon: LucideIcon;
  label: string;
}

export default function MarqueeCard({ icon: Icon, label }: MarqueeCardProps) {
  return (
    <div className="w-48 h-32 gova-splash-marquee-card flex flex-col items-center justify-center shrink-0">
      <div className="gova-merchant-icon-well mb-2">
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-xs font-semibold text-on-surface">{label}</span>
    </div>
  );
}
