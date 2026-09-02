import type { BundleAnalysisNode } from "@asol/release-core/console";

import { SizeBar } from "./SizeBar";

export function CategoryTree({ nodes }: { nodes: BundleAnalysisNode[] }) {
  const maximum = Math.max(0, ...nodes.map((node) => node.compressedBytes));
  return (
    <div id='google-play-console-presentation-components-categorytree-div-1-861l6f' className="space-y-3">
      {nodes.map((node) => (
        <div key={node.id} className="rounded-md border bg-surface p-3">
          <SizeBar value={node.compressedBytes} maximum={maximum} label={node.label} />
          <div className="mt-2 text-xs text-on-surface-variant">
            {node.entryCount} / {node.uncompressedBytes}
          </div>
        </div>
      ))}
    </div>
  );
}
