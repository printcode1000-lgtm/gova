import { cn } from '@/shared/utils';


function Skeleton({
  className,
  id,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { }) {
  return (
    <div id={id}
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };
