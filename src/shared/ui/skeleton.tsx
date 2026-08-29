import { cn } from '@/shared/utils';
import { type UiDescriptor } from '@asol/ui-registry-core';

import { uiPrimitiveAttributes } from './ui-primitive-attributes';

function Skeleton({
  className,
  ui,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { ui?: UiDescriptor }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
      {...uiPrimitiveAttributes('skeleton', ui)}
    />
  );
}

export { Skeleton };
