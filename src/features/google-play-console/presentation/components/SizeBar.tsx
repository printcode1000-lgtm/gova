export function SizeBar({
  id,
  value,
  maximum,
  label,
}: { value: number; maximum: number; label: string } & { id?: string }) {
  const width = maximum > 0 ? Math.min(100, (value / maximum) * 100) : 0;
  return (
    <div id={id} className="space-y-1">
      <div id="google-play-console-presentation-components-sizebar-div-2-9heu8j" className="flex justify-between gap-2 text-xs">
        <span id="google-play-console-presentation-components-sizebar-text-3-my9e2j">{label}</span>
        <span id="google-play-console-presentation-components-sizebar-text-4-gd73uz">{value}</span>
      </div>
      <div id="google-play-console-presentation-components-sizebar-div-5-ndo6x0" className="h-2 overflow-hidden rounded-sm bg-muted">
        <div id="google-play-console-presentation-components-sizebar-div-6-qmzkjl" className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
