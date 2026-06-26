import Image from 'next/image';

type AppIconSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<AppIconSize, { imageWidth: number; imageHeight: number }> = {
  sm: { imageWidth: 64, imageHeight: 64 },
  md: { imageWidth: 80, imageHeight: 80 },
  lg: { imageWidth: 96, imageHeight: 96 },
};

interface AppIconProps {
  size?: AppIconSize;
  className?: string;
}

export default function AppIcon({ size = 'lg', className = '' }: AppIconProps) {
  const sizes = sizeClasses[size];

  return (
    <div className={`relative ${className}`}>
      <Image
        src="/logo.png"
        alt="Gova App Icon"
        width={sizes.imageWidth}
        height={sizes.imageHeight}
        className="object-contain"
      />
    </div>
  );
}
