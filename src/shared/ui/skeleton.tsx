import { cn } from '@/shared/utils';


function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { }) {
  return (
    <div id="shared-ui-skeleton-div-1-z5ewym"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
