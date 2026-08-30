import Image from 'next/image';
import { BRANDING_WEB_APP_ICON_PATH } from '@asol/branding-core';
import { withBasePath } from '@/core/config/public-env';
import { createOpaqueUiInstanceId, uiAttributes } from "@asol/ui-registry-core";

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

export default function AppIcon({ id, size = 'lg', className = '' }: AppIconProps & { id?: string }) {
  const instance = createOpaqueUiInstanceId("app-icon", id ?? size);
  const sizes = sizeClasses[size];

  return (
    <div {...uiAttributes({ uid: "shared.brand.app-icon.div-4vmYu5", id: "shared.brand.app-icon.div", instance: instance })} id={id} className={`relative ${className}`}>
      <Image
        src={withBasePath(BRANDING_WEB_APP_ICON_PATH)}
        alt="Asol App Icon"
        width={sizes.imageWidth}
        height={sizes.imageHeight}
        loading="eager"
        className="object-contain"
      />
    </div>
  );
}
