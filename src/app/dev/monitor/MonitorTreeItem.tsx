"use client";

import * as React from "react";

import {
  LAYER_COLORS,
  STATUS_COLORS,
  type TreeNode,
} from "@asol/observability-core";
import { uiAttributes } from "@asol/ui-registry-core";

interface MonitorTreeItemProps {
  node: TreeNode;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
}

export function MonitorTreeItem({ id,
  node,
  onSelect,
  selectedId,
}: MonitorTreeItemProps & { id?: string }) {
  const [isOpen, setIsOpen] = React.useState<boolean>(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div {...uiAttributes({ uid: "dev.monitor.monitor-tree-item.div-ZPN7D8", id: "dev.monitor.monitor-tree-item.div" })} id={id} className="tree-node">
      <div {...uiAttributes({ uid: "dev.monitor.monitor-tree-item.div.2-sU4GEO", id: "dev.monitor.monitor-tree-item.div.2" })}
        className="tree-node-row"
        onClick={() => {
          if (hasChildren) {
            setIsOpen(!isOpen);
          } else if (node.records && node.records[0]) {
            onSelect(node.records[0].id);
          }
        }}
        style={{
          background:
            selectedId && node.records?.[0]?.id === selectedId
              ? "var(--bg-active)"
              : "",
          borderLeft: !hasChildren
            ? `2px solid ${node.records?.[0]?.table ? LAYER_COLORS.database : LAYER_COLORS.hook}`
            : "",
        }}
      >
        <div {...uiAttributes({ uid: "dev.monitor.monitor-tree-item.div.3-9293Az", id: "dev.monitor.monitor-tree-item.div.3" })} className="tree-node-info">
          {hasChildren && <span {...uiAttributes({ uid: "dev.monitor.monitor-tree-item.span-u6D7Ij", id: "dev.monitor.monitor-tree-item.span" })}>{isOpen ? "▼" : "▶"}</span>}
          {!hasChildren && (
            <div {...uiAttributes({ uid: "dev.monitor.monitor-tree-item.div.4-q5H6MH", id: "dev.monitor.monitor-tree-item.div.4" })}
              className="layer-dot"
              style={{
                background: node.records?.[0]?.table
                  ? LAYER_COLORS.database
                  : LAYER_COLORS.hook,
              }}
            />
          )}
          <span {...uiAttributes({ uid: "dev.monitor.monitor-tree-item.span.2-A96KEb", id: "dev.monitor.monitor-tree-item.span.2" })} style={{ fontWeight: hasChildren ? "bold" : "normal" }}>
            {node.label}
          </span>
          {hasChildren && (
            <span {...uiAttributes({ uid: "dev.monitor.monitor-tree-item.span.3-Y41UFj", id: "dev.monitor.monitor-tree-item.span.3" })} style={{ color: "var(--text-muted)", fontSize: "11px" }}>
              ({node.count})
            </span>
          )}
        </div>

        {!hasChildren && node.records?.[0] && (
          <div {...uiAttributes({ uid: "dev.monitor.monitor-tree-item.div.5-t5JiZ2", id: "dev.monitor.monitor-tree-item.div.5" })} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span {...uiAttributes({ uid: "dev.monitor.monitor-tree-item.span.4-Qc1U3Z", id: "dev.monitor.monitor-tree-item.span.4" })}
              style={{
                color: STATUS_COLORS[node.records[0].status],
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              {node.records[0].status.toUpperCase()}
            </span>
            <span {...uiAttributes({ uid: "dev.monitor.monitor-tree-item.span.5-fjL4Rv", id: "dev.monitor.monitor-tree-item.span.5" })} style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {Math.round(
                node.records[0].executionTime ||
                  node.records[0].completedAt - node.records[0].startedAt,
              )}
              ms
            </span>
          </div>
        )}
      </div>

      {isOpen && hasChildren && (
        <div {...uiAttributes({ uid: "dev.monitor.monitor-tree-item.div.6-3VFPnK", id: "dev.monitor.monitor-tree-item.div.6" })}>
          {node.children.map((child) => (
            <MonitorTreeItem
              key={child.key}
              node={child}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
