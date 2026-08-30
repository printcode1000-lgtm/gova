import type { BundleAnalysisNode } from "@asol/release-core/console";

import { SizeBar } from "./SizeBar";
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

export function CategoryTree({ nodes }: { nodes: BundleAnalysisNode[] }) {
  const maximum = Math.max(0, ...nodes.map((node) => node.compressedBytes));
  return (
    <div {...uiAttributes({ uid: "google-play-console.category-tree.div.2-i5KXZ1", id: "google-play-console.category-tree.div.2" })} id="google-play-console.category-tree.div" className="space-y-3">
      {nodes.map((node) => (
        <div key={node.id} {...uiAttributes({ uid: "google-play-console.category-tree.div.3-PeQKO6", id: "google-play-console.category-tree.div.3" , instance: createOpaqueUiInstanceId("iter-b3129d283c", String(node.id))})} className="rounded-md border bg-surface p-3">
          <SizeBar instance={createOpaqueUiInstanceId("node", String(node.id))} value={node.compressedBytes} maximum={maximum} label={node.label} />
          <div {...uiAttributes({ uid: "google-play-console.category-tree.div.4-0XXxEh", id: "google-play-console.category-tree.div.4" , instance: createOpaqueUiInstanceId("iter-bc2b521119", String(node.id))})} className="mt-2 text-xs text-on-surface-variant">
            {node.entryCount} / {node.uncompressedBytes}
          </div>
        </div>
      ))}
    </div>
  );
}
