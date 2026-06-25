import { Store } from 'lucide-react';

type AppIconSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<AppIconSize, { box: string; icon: string }> = {
  sm: { box: 'w-16 h-16', icon: 'w-9 h-9' },
  md: { box: 'w-20 h-20', icon: 'w-12 h-12' },
  lg: { box: 'w-24 h-24', icon: 'w-14 h-14' },
};

interface AppIconProps {
  size?: AppIconSize;
  className?: string;
}

export default function AppIcon({ size = 'lg', className = '' }: AppIconProps) {
  const sizes = sizeClasses[size];

  return (
    <div className={`relative group ${className}`}>
      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
      <div
        className={`${sizes.box} bg-primary text-on-primary rounded-2xl flex items-center justify-center shadow-2xl relative border-2 border-on-primary/20`}
      >
        <Store className={`${sizes.icon} text-on-primary`} />
      </div>
    </div>
  );
}
