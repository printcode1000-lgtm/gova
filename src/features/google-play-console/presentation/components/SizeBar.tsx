export function SizeBar({ value, maximum, label }: { value: number; maximum: number; label: string }) {
  const width = maximum > 0 ? Math.min(100, value / maximum * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-2 text-xs"><span>{label}</span><span>{value}</span></div>
      <div className="h-2 overflow-hidden rounded-sm bg-muted">
        <div className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
