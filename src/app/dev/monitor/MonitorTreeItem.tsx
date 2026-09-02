"use client";

import * as React from "react";

import {
  LAYER_COLORS,
  STATUS_COLORS,
  type TreeNode,
} from "@asol/observability-core";

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
    <div id={id} className="tree-node">
      <div id="app-dev-monitor-monitortreeitem-div-2-sffyp8"
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
        <div id="app-dev-monitor-monitortreeitem-div-3-bvpvfs" className="tree-node-info">
          {hasChildren && <span id="app-dev-monitor-monitortreeitem-text-4-pepy3e">{isOpen ? "▼" : "▶"}</span>}
          {!hasChildren && (
            <div id="app-dev-monitor-monitortreeitem-div-5-fmmend"
              className="layer-dot"
              style={{
                background: node.records?.[0]?.table
                  ? LAYER_COLORS.database
                  : LAYER_COLORS.hook,
              }}
            />
          )}
          <span id="app-dev-monitor-monitortreeitem-text-6-xjn1cd" style={{ fontWeight: hasChildren ? "bold" : "normal" }}>
            {node.label}
          </span>
          {hasChildren && (
            <span id="app-dev-monitor-monitortreeitem-text-7-29b4ar" style={{ color: "var(--text-muted)", fontSize: "11px" }}>
              ({node.count})
            </span>
          )}
        </div>

        {!hasChildren && node.records?.[0] && (
          <div id="app-dev-monitor-monitortreeitem-div-8-v2faww" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span id="app-dev-monitor-monitortreeitem-text-9-wglqp8"
              style={{
                color: STATUS_COLORS[node.records[0].status],
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              {node.records[0].status.toUpperCase()}
            </span>
            <span id="app-dev-monitor-monitortreeitem-text-10-rmpyuz" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
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
        <div id="app-dev-monitor-monitortreeitem-div-11-ht2v4f">
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
