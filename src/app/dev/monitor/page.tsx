'use client';

import { formatAdminClock } from '@asol/format-core';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { useMonitorStore, startNewFlow } from '@asol/observability-core';
import { LAYER_COLORS, OP_TYPE_COLORS, STATUS_COLORS, SLOW_QUERY_THRESHOLD_MS, resolveMonitorLayer } from '@asol/observability-core';
import type { OperationRecord, LayerName } from '@asol/observability-core';
import { SchemaSyncPanel } from './SchemaSyncPanel';
import { MonitorTreeItem } from './MonitorTreeItem';
import { diffMonitorLines } from './monitor-diff';
import { MONITOR_TABS } from './monitor-tabs';

// Guard production environment
import { isDevelopment } from '@/core/config';
import { uiAttributes , createOpaqueUiInstanceId, composeUiInstanceId} from "@asol/ui-registry-core";

if (!isDevelopment) {
  notFound();
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function MonitorPage() {
  const {
    operations,
    isLive,
    filter,
    selectedOperationId,
    activeTab,
    theme,
    autoScroll,
    toggleLive,
    clear,
    setFilter,
    resetFilter,
    selectOperation,
    setActiveTab,
    toggleTheme,
    togglePin,
    setAutoScroll,
    exportJSON,
    exportHTML,
    exportPDF,
    getFilteredOps,
    getStats,
    getCallGraph,
    getDependencyGraph,
    getTreeData,
    loadTheme,
  } = useMonitorStore();

  React.useEffect(() => {
    void loadTheme();
  }, [loadTheme]);

  const filteredOps = getFilteredOps();
  const stats = getStats();
  const treeData = getTreeData();
  const callGraph = getCallGraph();
  const dependencyGraph = getDependencyGraph();

  // Active operation selection for details drawer
  const activeOp = React.useMemo(() => {
    return operations.find((o) => o.id === selectedOperationId) || null;
  }, [operations, selectedOperationId]);

  // JSON Diff calculation for active operation
  const diffResult = React.useMemo(() => {
    if (!activeOp || !activeOp.previousResult) return null;
    const prev = JSON.stringify(activeOp.previousResult, null, 2);
    const curr = JSON.stringify(activeOp.currentResult, null, 2);
    return diffMonitorLines(prev, curr);
  }, [activeOp]);

  // Selected Request Flow ID for Flame/Replay
  const [selectedFlowId, setSelectedFlowId] = React.useState<string>('');
  const flows = React.useMemo(() => {
    const list = Array.from(new Set(operations.map((o) => o.requestFlowId)));
    return list.map((id) => {
      const first = operations.find((o) => o.requestFlowId === id);
      return { id, feature: first?.feature ?? 'unknown', timestamp: first?.timestamp ?? '' };
    });
  }, [operations]);

  React.useEffect(() => {
    if (flows.length > 0 && !selectedFlowId) {
      setSelectedFlowId(flows[0].id);
    }
  }, [flows, selectedFlowId]);

  // Replay scrubbing state
  const flowOps = React.useMemo(() => {
    return operations.filter((o) => o.requestFlowId === selectedFlowId);
  }, [operations, selectedFlowId]);

  const [replayIndex, setReplayIndex] = React.useState<number>(0);
  React.useEffect(() => {
    setReplayIndex(flowOps.length);
  }, [flowOps]);

  // Scroll tracking to trigger pause auto-scroll
  const listContainerRef = React.useRef<HTMLDivElement>(null);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!autoScroll) return;
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 20;
    if (!isAtBottom) {
      setAutoScroll(false);
    }
  };

  // Auto scroll effect
  React.useEffect(() => {
    if (autoScroll && listContainerRef.current) {
      listContainerRef.current.scrollTop = listContainerRef.current.scrollHeight;
    }
  }, [operations, autoScroll]);

  // Apply theme to document root
  React.useEffect(() => {
    document.documentElement.setAttribute('data-monitor-theme', theme);
  }, [theme]);

  // List unique filter values for populate selects
  const filterOptions = React.useMemo(() => {
    const opts = {
      features: new Set<string>(),
      pages: new Set<string>(),
      components: new Set<string>(),
      hooks: new Set<string>(),
      services: new Set<string>(),
      repositories: new Set<string>(),
      tables: new Set<string>(),
      entities: new Set<string>(),
      queryKeys: new Set<string>(),
    };
    operations.forEach((op) => {
      if (op.feature) opts.features.add(op.feature);
      if (op.page) opts.pages.add(op.page);
      if (op.component) opts.components.add(op.component);
      if (op.hook) opts.hooks.add(op.hook);
      if (op.service) opts.services.add(op.service);
      if (op.repository) opts.repositories.add(op.repository);
      if (op.table) opts.tables.add(op.table);
      if (op.entity) opts.entities.add(op.entity);
      if (op.queryKey) opts.queryKeys.add(op.queryKey);
    });
    return {
      features: Array.from(opts.features),
      pages: Array.from(opts.pages),
      components: Array.from(opts.components),
      hooks: Array.from(opts.hooks),
      services: Array.from(opts.services),
      repositories: Array.from(opts.repositories),
      tables: Array.from(opts.tables),
      entities: Array.from(opts.entities),
      queryKeys: Array.from(opts.queryKeys),
    };
  }, [operations]);

  return (
    <div {...uiAttributes({ uid: "dev.monitor.page.div.122-HYBi71", id: "dev.monitor.page.div.122" })} id="dev.monitor.page.div" className="monitor-container" dir="rtl">
      {/* Dynamic Theme Styles */}
      <style {...uiAttributes({ uid: "dev.monitor.page.style-J9AeQx", id: "dev.monitor.page.style" })} dangerouslySetInnerHTML={{ __html: `
        :root[data-monitor-theme="dark"] {
          --bg-main: #0b0f19;
          --bg-card: #151b2d;
          --bg-drawer: #1c233c;
          --bg-input: #1e2640;
          --border: #283354;
          --text-main: #f1f5f9;
          --text-muted: #94a3b8;
          --shadow: rgba(0, 0, 0, 0.4);
          --scroll-track: #0f172a;
          --scroll-thumb: #334155;
           #222b48;
        }
        :root[data-monitor-theme="light"] {
          --bg-main: #f8fafc;
          --bg-card: #ffffff;
          --bg-drawer: #f1f5f9;
          --bg-input: #e2e8f0;
          --border: #cbd5e1;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --shadow: rgba(0, 0, 0, 0.05);
          --scroll-track: #f1f5f9;
          --scroll-thumb: #cbd5e1;
           #e2e8f0;
        }

        .monitor-container {
          background-color: var(--bg-main);
          color: var(--text-main);
          min-height: 100vh;
          font-family: 'Inter', system-ui, sans-serif;
          padding: 24px;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* Scrollbar styles */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: var(--scroll-track);
        }
        ::-webkit-scrollbar-thumb {
          background: var(--scroll-thumb);
          border-radius: 4px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-title h1 {
          font-size: 24px;
          font-weight: 800;
          margin: 0;
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .badge-live {
          background: #ef4444;
          color: white;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
          animation: pulse 1.5s infinite;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-main);
          transition: all 0.2s ease;
        }
        .btn:active {
          background: var(--bg-active);
          transform: translateY(-1px);
        }
        .btn-primary {
          background: #3b82f6;
          color: white;
          border: none;
        }
        .btn-primary:active {
          background: #2563eb;
        }

        .tabs {
          display: flex;
          gap: 4px;
          background: var(--bg-card);
          padding: 4px;
          border-radius: 8px;
          border: 1px solid var(--border);
          margin-bottom: 20px;
          overflow-x: auto;
        }

        .tab-btn {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .tab-btn.active {
          background: var(--bg-active);
          color: var(--text-main);
        }

        /* Filter Controls */
        .filters-panel {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px var(--shadow);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 12px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .filter-group label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .filter-input {
          background: var(--bg-input);
          border: 1px solid var(--border);
          color: var(--text-main);
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 12px;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .filter-input:focus {
          border-color: #3b82f6;
        }

        .search-bar {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .search-input {
          flex: 1;
        }

        /* Dashboard grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px var(--shadow);
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease;
        }
        .stat-card:active {
          transform: translateY(-2px);
        }

        .stat-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 800;
        }

        .stat-card.alert {
          border-color: #f97316;
        }
        .stat-card.error {
          border-color: #ef4444;
        }

        .card-accent {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--accent);
        }

        /* Operations view */
        .ops-panel {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media(min-width: 1024px) {
          .ops-panel {
            grid-template-columns: 2fr 1fr;
          }
        }

        .operations-list-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px var(--shadow);
          display: flex;
          flex-direction: column;
          height: 600px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .scrollable-area {
          flex: 1;
          overflow-y: auto;
          padding-right: 4px;
        }

        /* Tree Styles */
        .tree-node {
          margin-left: 12px;
          border-left: 1px dashed var(--border);
          padding-left: 8px;
        }

        .tree-node-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 8px;
          border-radius: 6px;
          margin-bottom: 2px;
          font-size: 13px;
          transition: background-color 0.15s ease;
        }
        .tree-node-row:active {
          background: var(--bg-active);
        }

        .tree-node-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .layer-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        /* Operation Details Drawer */
        .drawer {
          position: fixed;
          top: 0;
          right: -550px;
          width: 550px;
          height: 100vh;
          background: var(--bg-drawer);
          border-left: 1px solid var(--border);
          box-shadow: -10px 0 30px rgba(0,0,0,0.5);
          transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          padding: 24px;
        }
        .drawer.open {
          right: 0;
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }

        .drawer-title {
          font-size: 18px;
          font-weight: 800;
        }

        .drawer-body {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .detail-section {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
        }

        .detail-section-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 8px;
          letter-spacing: 0.05em;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          font-size: 13px;
        }

        .info-label {
          color: var(--text-muted);
        }

        .info-value {
          font-weight: 600;
          text-align: right;
        }

        .code-block {
          background: #0f172a;
          color: #38bdf8;
          padding: 10px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 12px;
          overflow-x: auto;
          white-space: pre-wrap;
          margin: 0;
        }

        /* Diff highlight styles */
        .diff-line {
          display: block;
          padding: 1px 4px;
          font-family: monospace;
          font-size: 12px;
        }
        .diff-added { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        .diff-removed { background: rgba(239, 68, 68, 0.2); color: #f87171; }

        /* Flame chart styling */
        .flame-chart-container {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px var(--shadow);
          margin-bottom: 24px;
        }

        .flame-chart {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 16px;
          position: relative;
        }

        .flame-row {
          display: flex;
          align-items: center;
          height: 32px;
          border-bottom: 1px solid var(--border);
          position: relative;
        }

        .flame-row-label {
          width: 120px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .flame-bars-container {
          flex: 1;
          position: relative;
          height: 100%;
        }

        .flame-bar {
          position: absolute;
          height: 24px;
          top: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: white;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding: 0 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: transform 0.15s ease;
        }
        .flame-bar:active {
          transform: scaleY(1.08);
          z-index: 10;
        }

        /* SVG graphs */
        .svg-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px var(--shadow);
          height: 500px;
          display: flex;
          flex-direction: column;
        }

        /* Animations */
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }

        /* Print styles */
        @media print {
          .no-print {
            display: none !important;
          }
          .monitor-container {
            background: white !important;
            color: black !important;
            padding: 0;
          }
          .stat-card, .operations-list-card, .flame-chart-container {
            box-shadow: none !important;
            border: 1px solid #000 !important;
          }
        }
      ` }} />

      {/* ─── HEADER ─── */}
      <header {...uiAttributes({ uid: "dev.monitor.page.header.2-8C45g0", id: "dev.monitor.page.header.2" })} id="dev.monitor.page.header" className="header no-print">
        <div {...uiAttributes({ uid: "dev.monitor.page.div.123-Sd9vTM", id: "dev.monitor.page.div.123" })} id="dev.monitor.page.div.2" className="header-title">
          <h1 {...uiAttributes({ uid: "dev.monitor.page.h1.2-gCD3V0", id: "dev.monitor.page.h1.2" })} id="dev.monitor.page.h1">مراقب عمليات ASOL</h1>
          {isLive && <span {...uiAttributes({ uid: "dev.monitor.page.span.58-L2O2x0", id: "dev.monitor.page.span.58" })} id="dev.monitor.page.span" className="badge-live">مراقبة مباشرة</span>}
        </div>
        <div {...uiAttributes({ uid: "dev.monitor.page.div.124-m7IFBQ", id: "dev.monitor.page.div.124" })} id="dev.monitor.page.div.3" className="header-actions">
          <button {...uiAttributes({ uid: "dev.monitor.page.button.11-LC042U", id: "dev.monitor.page.button.11" })} id="dev.monitor.page.button" className="btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ الوضع الفاتح' : '🌙 الوضع الداكن'}
          </button>
          <button {...uiAttributes({ uid: "dev.monitor.page.button.12-X4B2OP", id: "dev.monitor.page.button.12" })} id="dev.monitor.page.button.2" className="btn" onClick={toggleLive}>
            {isLive ? '⏸️ إيقاف البث' : '▶️ استئناف البث'}
          </button>
          <button {...uiAttributes({ uid: "dev.monitor.page.button.13-87OPU5", id: "dev.monitor.page.button.13" })} id="dev.monitor.page.button.3" className="btn" onClick={clear}>
            🗑️ مسح السجلات
          </button>
          <button {...uiAttributes({ uid: "dev.monitor.page.button.14-R7QhIv", id: "dev.monitor.page.button.14" })} id="dev.monitor.page.button.4" className="btn" onClick={exportJSON}>
            📥 تصدير JSON
          </button>
          <button {...uiAttributes({ uid: "dev.monitor.page.button.15-b8AU2D", id: "dev.monitor.page.button.15" })} id="dev.monitor.page.button.5" className="btn" onClick={exportHTML}>
            📄 تصدير HTML
          </button>
          <button {...uiAttributes({ uid: "dev.monitor.page.button.16-456JY1", id: "dev.monitor.page.button.16" })} id="dev.monitor.page.button.6" className="btn" onClick={exportPDF}>
            🖨️ طباعة PDF
          </button>
        </div>
      </header>

      {/* ─── TABS ─── */}
      <nav {...uiAttributes({ uid: "dev.monitor.page.nav.2-P8d569", id: "dev.monitor.page.nav.2" })} id="dev.monitor.page.nav" className="tabs no-print">
        {MONITOR_TABS.map((tab) => (
          <button
            key={tab.id} {...uiAttributes({ uid: "dev.monitor.page.button.17-9U6iiE", id: "dev.monitor.page.button.17" , instance: createOpaqueUiInstanceId("iter-23fa672a24", String(tab.id))})}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ─── FILTERS ─── */}
      <div {...uiAttributes({ uid: "dev.monitor.page.div.125-JcK060", id: "dev.monitor.page.div.125" })} id="dev.monitor.page.div.4" className="filters-panel no-print">
        <div {...uiAttributes({ uid: "dev.monitor.page.div.126-nq43Tu", id: "dev.monitor.page.div.126" })} id="dev.monitor.page.div.5" className="filters-grid">
          <div {...uiAttributes({ uid: "dev.monitor.page.div.127-C4yyfN", id: "dev.monitor.page.div.127" })} id="dev.monitor.page.div.6" className="filter-group">
            <label {...uiAttributes({ uid: "dev.monitor.page.label.16-1m4ACx", id: "dev.monitor.page.label.16" })} id="dev.monitor.page.label">الميزة</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.15-Zk05P7", id: "dev.monitor.page.select.15" })} id="dev.monitor.page.select"
              className="filter-input"
              value={filter.feature}
              onChange={(e) => setFilter({ feature: e.target.value })}
            >
              <option {...uiAttributes({ uid: "dev.monitor.page.option-P1Etj0", id: "dev.monitor.page.option" })} value="">كل الميزات</option>
              {filterOptions.features.map((f) => <option key={f} {...uiAttributes({ uid: "dev.monitor.page.option.2-YP0c1r", id: "dev.monitor.page.option.2" , instance: createOpaqueUiInstanceId("iter-2468f3542e", String(f))})} value={f}>{f}</option>)}
            </select>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.128-4LMmI3", id: "dev.monitor.page.div.128" })} id="dev.monitor.page.div.7" className="filter-group">
            <label {...uiAttributes({ uid: "dev.monitor.page.label.17-4fGq5K", id: "dev.monitor.page.label.17" })} id="dev.monitor.page.label.2">الصفحة</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.16-Pi2siW", id: "dev.monitor.page.select.16" })} id="dev.monitor.page.select.2"
              className="filter-input"
              value={filter.page}
              onChange={(e) => setFilter({ page: e.target.value })}
            >
              <option {...uiAttributes({ uid: "dev.monitor.page.option.3-r7lTOB", id: "dev.monitor.page.option.3" })} value="">كل الصفحات</option>
              {filterOptions.pages.map((p) => <option key={p} {...uiAttributes({ uid: "dev.monitor.page.option.4-1CJMVs", id: "dev.monitor.page.option.4" , instance: createOpaqueUiInstanceId("iter-d4c9dbddb5", String(p))})} value={p}>{p}</option>)}
            </select>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.129-TTi4oJ", id: "dev.monitor.page.div.129" })} id="dev.monitor.page.div.8" className="filter-group">
            <label {...uiAttributes({ uid: "dev.monitor.page.label.18-NFGfB3", id: "dev.monitor.page.label.18" })} id="dev.monitor.page.label.3">المكوّن</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.17-Cmg37J", id: "dev.monitor.page.select.17" })} id="dev.monitor.page.select.3"
              className="filter-input"
              value={filter.component}
              onChange={(e) => setFilter({ component: e.target.value })}
            >
              <option {...uiAttributes({ uid: "dev.monitor.page.option.5-b6QX8e", id: "dev.monitor.page.option.5" })} value="">كل المكوّنات</option>
              {filterOptions.components.map((c) => <option key={c} {...uiAttributes({ uid: "dev.monitor.page.option.6-U0sf66", id: "dev.monitor.page.option.6" , instance: createOpaqueUiInstanceId("iter-95922ac316", String(c))})} value={c}>{c}</option>)}
            </select>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.130-0RpfVt", id: "dev.monitor.page.div.130" })} id="dev.monitor.page.div.9" className="filter-group">
            <label {...uiAttributes({ uid: "dev.monitor.page.label.19-XEAmZ3", id: "dev.monitor.page.label.19" })} id="dev.monitor.page.label.4">الخطاف</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.18-JGc41b", id: "dev.monitor.page.select.18" })} id="dev.monitor.page.select.4"
              className="filter-input"
              value={filter.hook}
              onChange={(e) => setFilter({ hook: e.target.value })}
            >
              <option {...uiAttributes({ uid: "dev.monitor.page.option.7-0MzwGo", id: "dev.monitor.page.option.7" })} value="">كل الخطافات</option>
              {filterOptions.hooks.map((h) => <option key={h} {...uiAttributes({ uid: "dev.monitor.page.option.8-5k7dOw", id: "dev.monitor.page.option.8" , instance: createOpaqueUiInstanceId("iter-8efe5eaf95", String(h))})} value={h}>{h}</option>)}
            </select>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.131-5WhTB2", id: "dev.monitor.page.div.131" })} id="dev.monitor.page.div.10" className="filter-group">
            <label {...uiAttributes({ uid: "dev.monitor.page.label.20-q3o35N", id: "dev.monitor.page.label.20" })} id="dev.monitor.page.label.5">الخدمة</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.19-PjFSJ1", id: "dev.monitor.page.select.19" })} id="dev.monitor.page.select.5"
              className="filter-input"
              value={filter.service}
              onChange={(e) => setFilter({ service: e.target.value })}
            >
              <option {...uiAttributes({ uid: "dev.monitor.page.option.9-kq6KN5", id: "dev.monitor.page.option.9" })} value="">كل الخدمات</option>
              {filterOptions.services.map((s) => <option key={s} {...uiAttributes({ uid: "dev.monitor.page.option.10-1btU6H", id: "dev.monitor.page.option.10" , instance: createOpaqueUiInstanceId("iter-1651b8f907", String(s))})} value={s}>{s}</option>)}
            </select>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.132-O3biFO", id: "dev.monitor.page.div.132" })} id="dev.monitor.page.div.11" className="filter-group">
            <label {...uiAttributes({ uid: "dev.monitor.page.label.21-1LFwhA", id: "dev.monitor.page.label.21" })} id="dev.monitor.page.label.6">المستودع</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.20-sRL4Lt", id: "dev.monitor.page.select.20" })} id="dev.monitor.page.select.6"
              className="filter-input"
              value={filter.repository}
              onChange={(e) => setFilter({ repository: e.target.value })}
            >
              <option {...uiAttributes({ uid: "dev.monitor.page.option.11-HCOqc8", id: "dev.monitor.page.option.11" })} value="">كل المستودعات</option>
              {filterOptions.repositories.map((r) => <option key={r} {...uiAttributes({ uid: "dev.monitor.page.option.12-5m0Xp4", id: "dev.monitor.page.option.12" , instance: createOpaqueUiInstanceId("iter-98d1a9da86", String(r))})} value={r}>{r}</option>)}
            </select>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.133-6MlnM9", id: "dev.monitor.page.div.133" })} id="dev.monitor.page.div.12" className="filter-group">
            <label {...uiAttributes({ uid: "dev.monitor.page.label.22-rN3Ny2", id: "dev.monitor.page.label.22" })} id="dev.monitor.page.label.7">الجدول</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.21-D9xs3R", id: "dev.monitor.page.select.21" })} id="dev.monitor.page.select.7"
              className="filter-input"
              value={filter.table}
              onChange={(e) => setFilter({ table: e.target.value })}
            >
              <option {...uiAttributes({ uid: "dev.monitor.page.option.13-6EV0Zc", id: "dev.monitor.page.option.13" })} value="">كل الجداول</option>
              {filterOptions.tables.map((t) => <option key={t} {...uiAttributes({ uid: "dev.monitor.page.option.14-ZzamS5", id: "dev.monitor.page.option.14" , instance: createOpaqueUiInstanceId("iter-364712a015", String(t))})} value={t}>{t}</option>)}
            </select>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.134-1LVACN", id: "dev.monitor.page.div.134" })} id="dev.monitor.page.div.13" className="filter-group">
            <label {...uiAttributes({ uid: "dev.monitor.page.label.23-72AVjt", id: "dev.monitor.page.label.23" })} id="dev.monitor.page.label.8">الكيان</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.22-hRbe5M", id: "dev.monitor.page.select.22" })} id="dev.monitor.page.select.8"
              className="filter-input"
              value={filter.entity}
              onChange={(e) => setFilter({ entity: e.target.value })}
            >
              <option {...uiAttributes({ uid: "dev.monitor.page.option.15-soQAx1", id: "dev.monitor.page.option.15" })} value="">كل الكيانات</option>
              {filterOptions.entities.map((ent) => <option key={ent} {...uiAttributes({ uid: "dev.monitor.page.option.16-IG3JL4", id: "dev.monitor.page.option.16" , instance: createOpaqueUiInstanceId("iter-0bfeb8c199", String(ent))})} value={ent}>{ent}</option>)}
            </select>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.135-9Gxx98", id: "dev.monitor.page.div.135" })} id="dev.monitor.page.div.14" className="filter-group">
            <label {...uiAttributes({ uid: "dev.monitor.page.label.24-qz1XUR", id: "dev.monitor.page.label.24" })} id="dev.monitor.page.label.9">مفتاح الاستعلام</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.23-R8sXC9", id: "dev.monitor.page.select.23" })} id="dev.monitor.page.select.9"
              className="filter-input"
              value={filter.queryKey}
              onChange={(e) => setFilter({ queryKey: e.target.value })}
            >
              <option {...uiAttributes({ uid: "dev.monitor.page.option.17-yKBG3k", id: "dev.monitor.page.option.17" })} value="">كل مفاتيح الاستعلام</option>
              {filterOptions.queryKeys.map((qk) => <option key={qk} {...uiAttributes({ uid: "dev.monitor.page.option.18-9yAG4E", id: "dev.monitor.page.option.18" , instance: createOpaqueUiInstanceId("iter-145be09feb", String(qk))})} value={qk}>{qk}</option>)}
            </select>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.136-8zNfu7", id: "dev.monitor.page.div.136" })} id="dev.monitor.page.div.15" className="filter-group">
            <label {...uiAttributes({ uid: "dev.monitor.page.label.25-taobU8", id: "dev.monitor.page.label.25" })} id="dev.monitor.page.label.10">نوع العملية</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.24-6J6xu8", id: "dev.monitor.page.select.24" })} id="dev.monitor.page.select.10"
              className="filter-input"
              value={filter.operationType}
              onChange={(e) => setFilter({ operationType: e.target.value })}
            >
              <option {...uiAttributes({ uid: "dev.monitor.page.option.19-nY52fv", id: "dev.monitor.page.option.19" })} value="">كل الأنواع</option>
              <option {...uiAttributes({ uid: "dev.monitor.page.option.20-OIKs6Y", id: "dev.monitor.page.option.20" })} value="SELECT">SELECT</option>
              <option {...uiAttributes({ uid: "dev.monitor.page.option.21-KR695b", id: "dev.monitor.page.option.21" })} value="INSERT">INSERT</option>
              <option {...uiAttributes({ uid: "dev.monitor.page.option.22-9mEFu7", id: "dev.monitor.page.option.22" })} value="UPDATE">UPDATE</option>
              <option {...uiAttributes({ uid: "dev.monitor.page.option.23-uNvzP5", id: "dev.monitor.page.option.23" })} value="DELETE">DELETE</option>
            </select>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.137-q1pqU2", id: "dev.monitor.page.div.137" })} id="dev.monitor.page.div.16" className="filter-group">
            <label {...uiAttributes({ uid: "dev.monitor.page.label.26-5mfFfY", id: "dev.monitor.page.label.26" })} id="dev.monitor.page.label.11">الحالة</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.25-4TY1FS", id: "dev.monitor.page.select.25" })} id="dev.monitor.page.select.11"
              className="filter-input"
              value={filter.status}
              onChange={(e) => setFilter({ status: e.target.value })}
            >
              <option {...uiAttributes({ uid: "dev.monitor.page.option.24-k4xDW9", id: "dev.monitor.page.option.24" })} value="">كل الحالات</option>
              <option {...uiAttributes({ uid: "dev.monitor.page.option.25-F6W37b", id: "dev.monitor.page.option.25" })} value="success">نجاح</option>
              <option {...uiAttributes({ uid: "dev.monitor.page.option.26-TV4vL6", id: "dev.monitor.page.option.26" })} value="pending">قيد التنفيذ</option>
              <option {...uiAttributes({ uid: "dev.monitor.page.option.27-3lCMfV", id: "dev.monitor.page.option.27" })} value="error">خطأ</option>
            </select>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.138-llWU3j", id: "dev.monitor.page.div.138" })} id="dev.monitor.page.div.17" className="filter-group">
            <label {...uiAttributes({ uid: "dev.monitor.page.label.27-75vGJX", id: "dev.monitor.page.label.27" })} id="dev.monitor.page.label.12">محرك قاعدة البيانات</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.26-LERx2p", id: "dev.monitor.page.select.26" })} id="dev.monitor.page.select.12"
              className="filter-input"
              value={filter.dbDriver}
              onChange={(e) => setFilter({ dbDriver: e.target.value })}
            >
              <option {...uiAttributes({ uid: "dev.monitor.page.option.28-AQ9yO8", id: "dev.monitor.page.option.28" })} value="">كل المحركات</option>
              <option {...uiAttributes({ uid: "dev.monitor.page.option.29-AZ7Zwz", id: "dev.monitor.page.option.29" })} value="SQLite-Dev">SQLite للتطوير</option>
              <option {...uiAttributes({ uid: "dev.monitor.page.option.30-g2HZHX", id: "dev.monitor.page.option.30" })} value="Turso-Production">Turso للإنتاج</option>
            </select>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.139-wjF8q8", id: "dev.monitor.page.div.139" })} id="dev.monitor.page.div.18" className="filter-group">
            <label {...uiAttributes({ uid: "dev.monitor.page.label.28-7UAWN5", id: "dev.monitor.page.label.28" })} id="dev.monitor.page.label.13">مصدر الذاكرة المؤقتة</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.27-rK5564", id: "dev.monitor.page.select.27" })} id="dev.monitor.page.select.13"
              className="filter-input"
              value={filter.cacheSource}
              onChange={(e) => setFilter({ cacheSource: e.target.value })}
            >
              <option {...uiAttributes({ uid: "dev.monitor.page.option.31-j0T0Nv", id: "dev.monitor.page.option.31" })} value="">كل مصادر الذاكرة المؤقتة</option>
              <option {...uiAttributes({ uid: "dev.monitor.page.option.32-RrdMM0", id: "dev.monitor.page.option.32" })} value="Memory">ذاكرة مؤقتة RAM</option>
              <option {...uiAttributes({ uid: "dev.monitor.page.option.33-2tSs0G", id: "dev.monitor.page.option.33" })} value="IndexedDB">IndexedDB</option>
              <option {...uiAttributes({ uid: "dev.monitor.page.option.34-XIMKv4", id: "dev.monitor.page.option.34" })} value="HTTP">HTTP (AsolApiClient)</option>
              <option {...uiAttributes({ uid: "dev.monitor.page.option.35-RD7gth", id: "dev.monitor.page.option.35" })} value="Database">مصدر قاعدة البيانات</option>
            </select>
          </div>
        </div>

        <div {...uiAttributes({ uid: "dev.monitor.page.div.140-X07yOp", id: "dev.monitor.page.div.140" })} id="dev.monitor.page.div.19" className="search-bar">
          <input {...uiAttributes({ uid: "dev.monitor.page.input.4-1aKM9F", id: "dev.monitor.page.input.4" })} id="dev.monitor.page.input"
            className="filter-input search-input"
            placeholder="ابحث في الميزات أو SQL أو الخطافات أو مفاتيح الاستعلام أو رسائل الخطأ..."
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
          />
          <button {...uiAttributes({ uid: "dev.monitor.page.button.18-eYoFZ5", id: "dev.monitor.page.button.18" })} id="dev.monitor.page.button.7" className="btn" onClick={resetFilter}>إعادة ضبط الفلاتر</button>
        </div>
      </div>

      {/* ─── TAB CONTENT: DASHBOARD ─── */}
      {activeTab === 'dashboard' && (
        <section {...uiAttributes({ uid: "dev.monitor.page.section.9-gikPZ7", id: "dev.monitor.page.section.9" })} id="dev.monitor.page.section">
          <div {...uiAttributes({ uid: "dev.monitor.page.div.141-W62cxq", id: "dev.monitor.page.div.141" })} id="dev.monitor.page.div.20" className="stats-grid">
            <div {...uiAttributes({ uid: "dev.monitor.page.div.142-K6O0Ql", id: "dev.monitor.page.div.142" })} id="dev.monitor.page.div.21" className="stat-card">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.59-j7tUSN", id: "dev.monitor.page.span.59" })} id="dev.monitor.page.span.2" className="stat-title">إجمالي العمليات</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.60-4B73EY", id: "dev.monitor.page.span.60" })} id="dev.monitor.page.span.3" className="stat-value">{filteredOps.length}</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.143-HG267F", id: "dev.monitor.page.div.143" })} id="dev.monitor.page.div.22" className="card-accent" style={{ '--accent': '#3b82f6' } as any} />
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.144-Xkx81V", id: "dev.monitor.page.div.144" })} id="dev.monitor.page.div.23" className="stat-card">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.61-z05ESR", id: "dev.monitor.page.span.61" })} id="dev.monitor.page.span.4" className="stat-title">قراءات (SELECT)</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.62-AXGZ27", id: "dev.monitor.page.span.62" })} id="dev.monitor.page.span.5" className="stat-value">{stats.totalReads}</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.145-C0J6Td", id: "dev.monitor.page.div.145" })} id="dev.monitor.page.div.24" className="card-accent" style={{ '--accent': '#22c55e' } as any} />
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.146-86RAf2", id: "dev.monitor.page.div.146" })} id="dev.monitor.page.div.25" className="stat-card">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.63-BfNPd6", id: "dev.monitor.page.span.63" })} id="dev.monitor.page.span.6" className="stat-title">كتابات (MUTATIONS)</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.64-xUR2y2", id: "dev.monitor.page.span.64" })} id="dev.monitor.page.span.7" className="stat-value">{stats.totalWrites}</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.147-TyPon7", id: "dev.monitor.page.div.147" })} id="dev.monitor.page.div.26" className="card-accent" style={{ '--accent': '#ef4444' } as any} />
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.148-3PSIH9", id: "dev.monitor.page.div.148" })} id="dev.monitor.page.div.27" className="stat-card">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.65-c8Cq12", id: "dev.monitor.page.span.65" })} id="dev.monitor.page.span.8" className="stat-title">إجمالي استدعاءات قاعدة البيانات</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.66-C093Me", id: "dev.monitor.page.span.66" })} id="dev.monitor.page.span.9" className="stat-value">{stats.totalDbCalls}</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.149-c0FLNv", id: "dev.monitor.page.div.149" })} id="dev.monitor.page.div.28" className="card-accent" style={{ '--accent': '#a855f7' } as any} />
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.150-42hP6u", id: "dev.monitor.page.div.150" })} id="dev.monitor.page.div.29" className="stat-card">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.67-xqG9T7", id: "dev.monitor.page.span.67" })} id="dev.monitor.page.span.10" className="stat-title">إصابات الذاكرة المؤقتة</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.68-5B7WqA", id: "dev.monitor.page.span.68" })} id="dev.monitor.page.span.11" className="stat-value">{stats.totalCacheHits}</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.151-Vq1RkI", id: "dev.monitor.page.div.151" })} id="dev.monitor.page.div.30" className="card-accent" style={{ '--accent': '#eab308' } as any} />
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.152-2D6PVB", id: "dev.monitor.page.div.152" })} id="dev.monitor.page.div.31" className="stat-card">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.69-4bBdPJ", id: "dev.monitor.page.span.69" })} id="dev.monitor.page.span.12" className="stat-title">إخفاقات الذاكرة المؤقتة</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.70-y6x0GN", id: "dev.monitor.page.span.70" })} id="dev.monitor.page.span.13" className="stat-value">{stats.totalCacheMisses}</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.153-8AHhAE", id: "dev.monitor.page.div.153" })} id="dev.monitor.page.div.32" className="card-accent" style={{ '--accent': '#a855f7' } as any} />
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.154-oQXD2A", id: "dev.monitor.page.div.154" })} id="dev.monitor.page.div.33" className="stat-card">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.71-OLVuJ0", id: "dev.monitor.page.span.71" })} id="dev.monitor.page.span.14" className="stat-title">نسبة إصابة الذاكرة المؤقتة</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.72-nG65OC", id: "dev.monitor.page.span.72" })} id="dev.monitor.page.span.15" className="stat-value">{stats.cacheHitRate}%</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.155-E2lEZ0", id: "dev.monitor.page.div.155" })} id="dev.monitor.page.div.34" className="card-accent" style={{ '--accent': '#eab308' } as any} />
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.156-aCF2s4", id: "dev.monitor.page.div.156" })} id="dev.monitor.page.div.35" className="stat-card">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.73-rvrlB8", id: "dev.monitor.page.span.73" })} id="dev.monitor.page.span.16" className="stat-title">استعلامات نشطة</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.74-rtAK31", id: "dev.monitor.page.span.74" })} id="dev.monitor.page.span.17" className="stat-value">{stats.activeQueries}</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.157-S5eKdM", id: "dev.monitor.page.div.157" })} id="dev.monitor.page.div.36" className="card-accent" style={{ '--accent': '#06b6d4' } as any} />
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.158-kRJ9x6", id: "dev.monitor.page.div.158" })} id="dev.monitor.page.div.37" className="stat-card">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.75-KYIg2H", id: "dev.monitor.page.span.75" })} id="dev.monitor.page.span.18" className="stat-title">تعديلات نشطة</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.76-PJNm88", id: "dev.monitor.page.span.76" })} id="dev.monitor.page.span.19" className="stat-value">{stats.activeMutations}</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.159-xSA4ZC", id: "dev.monitor.page.div.159" })} id="dev.monitor.page.div.38" className="card-accent" style={{ '--accent': '#f97316' } as any} />
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.160-ZzG5I8", id: "dev.monitor.page.div.160" })} id="dev.monitor.page.div.39" className="stat-card">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.77-9FhvNg", id: "dev.monitor.page.span.77" })} id="dev.monitor.page.span.20" className="stat-title">قراءات دون اتصال</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.78-pKxc6G", id: "dev.monitor.page.span.78" })} id="dev.monitor.page.span.21" className="stat-value">{stats.offlineReads}</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.161-t91YMH", id: "dev.monitor.page.div.161" })} id="dev.monitor.page.div.40" className="card-accent" style={{ '--accent': '#64748b' } as any} />
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.162-4JOiUp", id: "dev.monitor.page.div.162" })} id="dev.monitor.page.div.41" className="stat-card">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.79-F2Sh7v", id: "dev.monitor.page.span.79" })} id="dev.monitor.page.span.22" className="stat-title">قراءات متصلة</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.80-yFCT2h", id: "dev.monitor.page.span.80" })} id="dev.monitor.page.span.23" className="stat-value">{stats.onlineReads}</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.163-BCJ9A3", id: "dev.monitor.page.div.163" })} id="dev.monitor.page.div.42" className="card-accent" style={{ '--accent': '#3b82f6' } as any} />
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.164-N3H1Ug", id: "dev.monitor.page.div.164" })} id="dev.monitor.page.div.43" className="stat-card">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.81-LGBkD7", id: "dev.monitor.page.span.81" })} id="dev.monitor.page.span.24" className="stat-title">متوسط زمن قاعدة البيانات</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.82-x8GSsM", id: "dev.monitor.page.span.82" })} id="dev.monitor.page.span.25" className="stat-value">{stats.avgExecutionTime} ms</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.165-g5SCVN", id: "dev.monitor.page.div.165" })} id="dev.monitor.page.div.44" className="card-accent" style={{ '--accent': '#ef4444' } as any} />
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.166-Ix4rsV", id: "dev.monitor.page.div.166" })} id="dev.monitor.page.div.45" className="stat-card alert">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.83-Q7I7Qp", id: "dev.monitor.page.span.83" })} id="dev.monitor.page.span.26" className="stat-title">تنبيهات N+1</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.84-CL2Qvt", id: "dev.monitor.page.span.84" })} id="dev.monitor.page.span.27" className="stat-value" style={{ color: '#f97316' }}>{stats.n1Alerts}</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.167-I11Vyd", id: "dev.monitor.page.div.167" })} id="dev.monitor.page.div.46" className="card-accent" style={{ '--accent': '#f97316' } as any} />
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.168-t7vqGE", id: "dev.monitor.page.div.168" })} id="dev.monitor.page.div.47" className="stat-card error">
              <span {...uiAttributes({ uid: "dev.monitor.page.span.85-HrtBC1", id: "dev.monitor.page.span.85" })} id="dev.monitor.page.span.28" className="stat-title">استعلامات مكررة</span>
              <span {...uiAttributes({ uid: "dev.monitor.page.span.86-NtzBN6", id: "dev.monitor.page.span.86" })} id="dev.monitor.page.span.29" className="stat-value" style={{ color: '#ef4444' }}>{stats.duplicateAlerts}</span>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.169-V37EFU", id: "dev.monitor.page.div.169" })} id="dev.monitor.page.div.48" className="card-accent" style={{ '--accent': '#ef4444' } as any} />
            </div>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.170-0R6hG8", id: "dev.monitor.page.div.170" })} id="dev.monitor.page.div.49" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.171-K5VOHo", id: "dev.monitor.page.div.171" })} id="dev.monitor.page.div.50" className="detail-section">
              <div {...uiAttributes({ uid: "dev.monitor.page.div.172-d9cTZN", id: "dev.monitor.page.div.172" })} id="dev.monitor.page.div.51" className="detail-section-title">أبطأ عمليات قاعدة البيانات</div>
              {stats.slowestOps.length === 0 ? (
                <div {...uiAttributes({ uid: "dev.monitor.page.div.173-I0O2QR", id: "dev.monitor.page.div.173" })} id="dev.monitor.page.div.52" style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px' }}>لا توجد استعلامات مسجّلة.</div>
              ) : (
                <table {...uiAttributes({ uid: "dev.monitor.page.table.2-vy4Saf", id: "dev.monitor.page.table.2" })} id="dev.monitor.page.table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead {...uiAttributes({ uid: "dev.monitor.page.thead.2-87JY2i", id: "dev.monitor.page.thead.2" })} id="dev.monitor.page.thead">
                    <tr {...uiAttributes({ uid: "dev.monitor.page.tr.2-gcS9qd", id: "dev.monitor.page.tr.2" })} id="dev.monitor.page.tr" style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th {...uiAttributes({ uid: "dev.monitor.page.th.4-XUo37f", id: "dev.monitor.page.th.4" })} id="dev.monitor.page.th" style={{ padding: '6px' }}>الجدول</th>
                      <th {...uiAttributes({ uid: "dev.monitor.page.th.5-e3yZEr", id: "dev.monitor.page.th.5" })} id="dev.monitor.page.th.2" style={{ padding: '6px' }}>العملية</th>
                      <th {...uiAttributes({ uid: "dev.monitor.page.th.6-89uAUc", id: "dev.monitor.page.th.6" })} id="dev.monitor.page.th.3" style={{ padding: '6px', textAlign: 'right' }}>المدة (ms)</th>
                    </tr>
                  </thead>
                  <tbody {...uiAttributes({ uid: "dev.monitor.page.tbody.2-IW7YU4", id: "dev.monitor.page.tbody.2" })} id="dev.monitor.page.tbody">
                    {stats.slowestOps.map((op) => (
                      <tr key={op.id} {...uiAttributes({ uid: "dev.monitor.page.tr.3-3dZ19G", id: "dev.monitor.page.tr.3" , instance: createOpaqueUiInstanceId("iter-ce10dbbdac", String(op.id))})} style={{ borderBottom: '1px solid var(--border)' }} onClick={() => selectOperation(op.id)}>
                        <td {...uiAttributes({ uid: "dev.monitor.page.td-dy3jtO", id: "dev.monitor.page.td" , instance: createOpaqueUiInstanceId("iter-b4eafcfecd", String(op.id))})} style={{ padding: '6px', fontWeight: 600 }}>{op.table}</td>
                        <td {...uiAttributes({ uid: "dev.monitor.page.td.2-EgIqQ4", id: "dev.monitor.page.td.2" , instance: createOpaqueUiInstanceId("iter-b7a4549b85", String(op.id))})} style={{ padding: '6px' }}><span {...uiAttributes({ uid: "dev.monitor.page.span.87-gUR4yn", id: "dev.monitor.page.span.87" , instance: createOpaqueUiInstanceId("iter-b7a4549b85", String(op.id))})} style={{ color: OP_TYPE_COLORS[op.operationType] }}>{op.operationType}</span></td>
                        <td {...uiAttributes({ uid: "dev.monitor.page.td.3-x1K333", id: "dev.monitor.page.td.3" , instance: createOpaqueUiInstanceId("iter-44e8458a1a", String(op.id))})} style={{ padding: '6px', textAlign: 'right', fontWeight: 700, color: op.executionTime > SLOW_QUERY_THRESHOLD_MS ? '#ef4444' : 'var(--text-main)' }}>{op.executionTime} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div {...uiAttributes({ uid: "dev.monitor.page.div.174-76lOES", id: "dev.monitor.page.div.174" })} id="dev.monitor.page.div.53" className="detail-section">
              <div {...uiAttributes({ uid: "dev.monitor.page.div.175-BRPB2b", id: "dev.monitor.page.div.175" })} id="dev.monitor.page.div.54" className="detail-section-title">تحذيرات N+1 / التكرار</div>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.176-j56RMQ", id: "dev.monitor.page.div.176" })} id="dev.monitor.page.div.55" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredOps.filter(o => o.isDuplicate || o.isN1).length === 0 ? (
                  <div {...uiAttributes({ uid: "dev.monitor.page.div.177-pp7FNn", id: "dev.monitor.page.div.177" })} id="dev.monitor.page.div.56" style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px' }}>لا توجد مشاكل N+1 أو تكرار.</div>
                ) : (
                  filteredOps.filter(o => o.isDuplicate || o.isN1).map((op) => (
                    <div key={op.id} {...uiAttributes({ uid: "dev.monitor.page.div.178-Hv0UPX", id: "dev.monitor.page.div.178" , instance: createOpaqueUiInstanceId("iter-7e34b57028", String(op.id))})} className="tree-node-row" onClick={() => selectOperation(op.id)} style={{ borderLeft: op.isDuplicate ? '3px solid #ef4444' : '3px solid #f97316', paddingLeft: '8px' }}>
                      <div {...uiAttributes({ uid: "dev.monitor.page.div.179-HHjS1E", id: "dev.monitor.page.div.179" , instance: createOpaqueUiInstanceId("iter-c412ee7305", String(op.id))})}>
                        <div {...uiAttributes({ uid: "dev.monitor.page.div.180-guCul2", id: "dev.monitor.page.div.180" , instance: createOpaqueUiInstanceId("iter-ee0b6609d4", String(op.id))})} style={{ fontSize: '11px', color: 'var(--text-muted)' }}>التدفق: {op.requestFlowId.slice(0, 8)}…</div>
                        <div {...uiAttributes({ uid: "dev.monitor.page.div.181-GJfMy7", id: "dev.monitor.page.div.181" , instance: createOpaqueUiInstanceId("iter-e599fe3ee6", String(op.id))})} style={{ fontWeight: 600 }}>{op.operationType} {op.table}</div>
                      </div>
                      <div {...uiAttributes({ uid: "dev.monitor.page.div.182-p1J1HF", id: "dev.monitor.page.div.182" , instance: createOpaqueUiInstanceId("iter-31bf447741", String(op.id))})} style={{ display: 'flex', gap: '4px' }}>
                        {op.isDuplicate && <span {...uiAttributes({ uid: "dev.monitor.page.span.88-rX6Af4", id: "dev.monitor.page.span.88" , instance: createOpaqueUiInstanceId("iter-96bb9521ad", String(op.id))})} style={{ background: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>مكرر</span>}
                        {op.isN1 && <span {...uiAttributes({ uid: "dev.monitor.page.span.89-P9trFD", id: "dev.monitor.page.span.89" , instance: createOpaqueUiInstanceId("iter-995fcda82b", String(op.id))})} style={{ background: '#f97316', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>تنبيه N+1</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── TAB CONTENT: OPERATIONS (TREE VIEW) ─── */}
      {activeTab === 'operations' && (
        <section {...uiAttributes({ uid: "dev.monitor.page.section.10-O5LkMG", id: "dev.monitor.page.section.10" })} id="dev.monitor.page.section.2" className="ops-panel">
          <div {...uiAttributes({ uid: "dev.monitor.page.div.183-Ons3iE", id: "dev.monitor.page.div.183" })} id="dev.monitor.page.div.57" className="operations-list-card">
            <div {...uiAttributes({ uid: "dev.monitor.page.div.184-CnYVC6", id: "dev.monitor.page.div.184" })} id="dev.monitor.page.div.58" className="card-header">
              <h2 {...uiAttributes({ uid: "dev.monitor.page.h2.3-O49WXa", id: "dev.monitor.page.h2.3" })} id="dev.monitor.page.h2" style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>تتبع العمليات (شجرة التدفق)</h2>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.185-CCP0Al", id: "dev.monitor.page.div.185" })} id="dev.monitor.page.div.59" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label {...uiAttributes({ uid: "dev.monitor.page.label.29-Fmdt8l", id: "dev.monitor.page.label.29" })} id="dev.monitor.page.label.14" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input {...uiAttributes({ uid: "dev.monitor.page.input.5-JRf9IP", id: "dev.monitor.page.input.5" })} id="dev.monitor.page.input.2"
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                  />
                  📌 تمرير تلقائي
                </label>
                {!autoScroll && (
                  <button {...uiAttributes({ uid: "dev.monitor.page.button.19-a6zVbE", id: "dev.monitor.page.button.19" })} id="dev.monitor.page.button.8" className="btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setAutoScroll(true)}>
                    إعادة تفعيل التمرير التلقائي
                  </button>
                )}
              </div>
            </div>

            <div {...uiAttributes({ uid: "dev.monitor.page.div.186-EDQ9vP", id: "dev.monitor.page.div.186" })} id="dev.monitor.page.div.60" className="scrollable-area" ref={listContainerRef} onScroll={handleScroll}>
              {treeData.length === 0 ? (
                <div {...uiAttributes({ uid: "dev.monitor.page.div.187-N3WVwe", id: "dev.monitor.page.div.187" })} id="dev.monitor.page.div.61" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  لا توجد عمليات مسجّلة. نفّذ استعلامات أو تصفّح التطبيق لإظهارها.
                </div>
              ) : (
                treeData.map((node) => (
                  <MonitorTreeItem
                    key={node.key}
                    node={node}
                    onSelect={selectOperation}
                    selectedId={selectedOperationId}
                  />
                ))
              )}
            </div>
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.188-YjF7Iu", id: "dev.monitor.page.div.188" })} id="dev.monitor.page.div.62" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.189-CGLC4Z", id: "dev.monitor.page.div.189" })} id="dev.monitor.page.div.63" className="detail-section">
              <div {...uiAttributes({ uid: "dev.monitor.page.div.190-mIB7Y8", id: "dev.monitor.page.div.190" })} id="dev.monitor.page.div.64" className="detail-section-title">كيفية تفعيل التتبع</div>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.191-2Rt69z", id: "dev.monitor.page.div.191" })} id="dev.monitor.page.div.65" style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <ol {...uiAttributes({ uid: "dev.monitor.page.ol.2-6M9Fm1", id: "dev.monitor.page.ol.2" })} id="dev.monitor.page.ol" style={{ paddingLeft: '16px', margin: '4px 0' }}>
                  <li {...uiAttributes({ uid: "dev.monitor.page.li.4-KN0o0J", id: "dev.monitor.page.li.4" })} id="dev.monitor.page.li">انتقل إلى صفحات المصادقة (تسجيل الدخول أو التسجيل).</li>
                  <li {...uiAttributes({ uid: "dev.monitor.page.li.5-uOGFy8", id: "dev.monitor.page.li.5" })} id="dev.monitor.page.li.2">اضغط الأزرار أو املأ النماذج لتفعيل استدعاءات قاعدة البيانات والذاكرة المؤقتة.</li>
                  <li {...uiAttributes({ uid: "dev.monitor.page.li.6-1NuJgs", id: "dev.monitor.page.li.6" })} id="dev.monitor.page.li.3">ستظهر العمليات هنا مباشرة في الوقت الفعلي.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── TAB CONTENT: TIMELINE / FLAME CHART ─── */}
      {activeTab === 'timeline' && (
        <section {...uiAttributes({ uid: "dev.monitor.page.section.11-8jCuGa", id: "dev.monitor.page.section.11" })} id="dev.monitor.page.section.3">
          <div {...uiAttributes({ uid: "dev.monitor.page.div.192-A1UAUE", id: "dev.monitor.page.div.192" })} id="dev.monitor.page.div.66" className="detail-section" style={{ marginBottom: '16px' }}>
            <label {...uiAttributes({ uid: "dev.monitor.page.label.30-3DCRkB", id: "dev.monitor.page.label.30" })} id="dev.monitor.page.label.15" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>اختر تدفق الطلب لعرض الخط الزمني:</label>
            <select {...uiAttributes({ uid: "dev.monitor.page.select.28-2KLvwE", id: "dev.monitor.page.select.28" })} id="dev.monitor.page.select.14"
              className="filter-input"
              style={{ width: '100%', maxWidth: '400px' }}
              value={selectedFlowId}
              onChange={(e) => setSelectedFlowId(e.target.value)}
            >
              {flows.map((f) => (
                <option key={f.id} {...uiAttributes({ uid: "dev.monitor.page.option.36-21Vbew", id: "dev.monitor.page.option.36" , instance: createOpaqueUiInstanceId("iter-dfe071ae48", String(f.id))})} value={f.id}>
                  تدفق {f.id.slice(0, 8)}… ({f.feature}) — {formatAdminClock(f.timestamp, { seconds: true })}
                </option>
              ))}
            </select>
          </div>

          {selectedFlowId && flowOps.length > 0 ? (
            <div {...uiAttributes({ uid: "dev.monitor.page.div.193-IkM7eX", id: "dev.monitor.page.div.193" })} id="dev.monitor.page.div.67">
              <div {...uiAttributes({ uid: "dev.monitor.page.div.194-MOf1A1", id: "dev.monitor.page.div.194" })} id="dev.monitor.page.div.68" className="flame-chart-container">
                <div {...uiAttributes({ uid: "dev.monitor.page.div.195-M5HzUA", id: "dev.monitor.page.div.195" })} id="dev.monitor.page.div.69" style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  Flame Chart (مخطط جانت للطبقات)
                </div>
                <div {...uiAttributes({ uid: "dev.monitor.page.div.196-maM3Nk", id: "dev.monitor.page.div.196" })} id="dev.monitor.page.div.70" className="flame-chart">
                  {/* We group flowOps by layers to construct rows */}
                  {(['ui', 'hook', 'service', 'asol-api', 'query', 'repository', 'database', 'cache'] as LayerName[]).map((layer) => {
                    const layerItems = flowOps.filter((o) => resolveMonitorLayer(o) === layer);

                    // Calculate timing bounds of the entire flow
                    const startTimes = flowOps.map(o => o.startedAt);
                    const endTimes = flowOps.map(o => o.completedAt);
                    const flowStart = Math.min(...startTimes);
                    const flowEnd = Math.max(...endTimes);
                    const totalDuration = flowEnd - flowStart || 1;

                    return (
                      <div className="flame-row" key={layer} {...uiAttributes({ uid: "dev.monitor.page.div.197-3jXSt9", id: "dev.monitor.page.div.197" , instance: createOpaqueUiInstanceId("iter-fd793ae5a9", String(layer))})}>
                        <div {...uiAttributes({ uid: "dev.monitor.page.div.198-WhP8y9", id: "dev.monitor.page.div.198" , instance: createOpaqueUiInstanceId("iter-1b34248e2e", String(layer))})} className="flame-row-label">{layer}</div>
                        <div {...uiAttributes({ uid: "dev.monitor.page.div.199-9OfRmo", id: "dev.monitor.page.div.199" , instance: createOpaqueUiInstanceId("iter-67b064f46f", String(layer))})} className="flame-bars-container">
                          {layerItems.map((item) => {
                            const left = ((item.startedAt - flowStart) / totalDuration) * 100;
                            const width = Math.max(((item.completedAt - item.startedAt) / totalDuration) * 100, 1.5);
                            return (
                              <div
                                key={item.id} {...uiAttributes({ uid: "dev.monitor.page.div.200-FEPj5H", id: "dev.monitor.page.div.200" , instance: composeUiInstanceId(createOpaqueUiInstanceId("iter-9d4cd2e681", String(item.id)), createOpaqueUiInstanceId("iter-4e1639de1c", String(item.id)))})}
                                className="flame-bar"
                                onClick={() => selectOperation(item.id)}
                                style={{
                                  left: `${left}%`,
                                  width: `${width}%`,
                                  background: LAYER_COLORS[layer],
                                }}
                              >
                                {item.httpRoute || item.table || item.hook || item.service || item.id.slice(0, 4)} ({Math.round(item.completedAt - item.startedAt)}ms)
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step-by-Step Timeline Replay Scrub Bar */}
              <div {...uiAttributes({ uid: "dev.monitor.page.div.201-JK69Io", id: "dev.monitor.page.div.201" })} id="dev.monitor.page.div.71" className="detail-section">
                <div {...uiAttributes({ uid: "dev.monitor.page.div.202-7Jmj9M", id: "dev.monitor.page.div.202" })} id="dev.monitor.page.div.72" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div {...uiAttributes({ uid: "dev.monitor.page.div.203-jBCFa6", id: "dev.monitor.page.div.203" })} id="dev.monitor.page.div.73" style={{ fontSize: '14px', fontWeight: 700 }}>إعادة تشغيل الخط الزمني</div>
                  <div {...uiAttributes({ uid: "dev.monitor.page.div.204-Tx7UIi", id: "dev.monitor.page.div.204" })} id="dev.monitor.page.div.74" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    الخطوة {replayIndex} من {flowOps.length}
                  </div>
                </div>

                <input {...uiAttributes({ uid: "dev.monitor.page.input.6-CKMz48", id: "dev.monitor.page.input.6" })} id="dev.monitor.page.input.3"
                  type="range"
                  min="0"
                  max={flowOps.length}
                  value={replayIndex}
                  onChange={(e) => setReplayIndex(Number(e.target.value))}
                  style={{ width: '100%', marginBottom: '16px' }}
                />

                <div {...uiAttributes({ uid: "dev.monitor.page.div.205-YEod5p", id: "dev.monitor.page.div.205" })} id="dev.monitor.page.div.75" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {flowOps.slice(0, replayIndex).map((op, i) => (
                    <div
                      key={op.id} {...uiAttributes({ uid: "dev.monitor.page.div.206-Dre47W", id: "dev.monitor.page.div.206" , instance: createOpaqueUiInstanceId("iter-fe77326d10", String(op.id))})}
                      className="tree-node-row"
                      style={{ borderLeft: `3px solid ${op.table ? LAYER_COLORS.database : LAYER_COLORS.hook}` }}
                      onClick={() => selectOperation(op.id)}
                    >
                      <div {...uiAttributes({ uid: "dev.monitor.page.div.207-cd55Ec", id: "dev.monitor.page.div.207" , instance: createOpaqueUiInstanceId("iter-154d8444d4", String(op.id))})}>
                        <span {...uiAttributes({ uid: "dev.monitor.page.span.90-dH5Xq5", id: "dev.monitor.page.span.90" , instance: createOpaqueUiInstanceId("iter-baadf44203", String(op.id))})} style={{ color: 'var(--text-muted)', marginRight: '8px' }}>#{i + 1}</span>
                        <span {...uiAttributes({ uid: "dev.monitor.page.span.91-c1y6DZ", id: "dev.monitor.page.span.91" , instance: createOpaqueUiInstanceId("iter-e0ed06b447", String(op.id))})} style={{ fontWeight: 600 }}>{op.table ? `${op.operationType} ${op.table}` : op.queryKey || op.id.slice(0, 8)}</span>
                      </div>
                      <div {...uiAttributes({ uid: "dev.monitor.page.div.208-rSx405", id: "dev.monitor.page.div.208" , instance: createOpaqueUiInstanceId("iter-015ccfb5d4", String(op.id))})} style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        +{Math.round(op.executionTime)}ms
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div {...uiAttributes({ uid: "dev.monitor.page.div.209-ACas8e", id: "dev.monitor.page.div.209" })} id="dev.monitor.page.div.76" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد تدفقات طلب.</div>
          )}
        </section>
      )}

      {/* ─── TAB CONTENT: CALL GRAPH ─── */}
      {activeTab === 'call-graph' && (
        <section {...uiAttributes({ uid: "dev.monitor.page.section.12-Wge5fH", id: "dev.monitor.page.section.12" })} id="dev.monitor.page.section.4">
          <div {...uiAttributes({ uid: "dev.monitor.page.div.210-D6zQ3C", id: "dev.monitor.page.div.210" })} id="dev.monitor.page.div.77" className="svg-card">
            <div {...uiAttributes({ uid: "dev.monitor.page.div.211-pYUwI1", id: "dev.monitor.page.div.211" })} id="dev.monitor.page.div.78" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>مخطط سلسلة الاستدعاءات (SVG)</div>
            {callGraph.nodes.length === 0 ? (
              <div {...uiAttributes({ uid: "dev.monitor.page.div.212-W90NRN", id: "dev.monitor.page.div.212" })} id="dev.monitor.page.div.79" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                لا توجد عقد في الفلتر الحالي لرسم مخطط الاستدعاء.
              </div>
            ) : (
              <div {...uiAttributes({ uid: "dev.monitor.page.div.213-TXmXL4", id: "dev.monitor.page.div.213" })} id="dev.monitor.page.div.80" style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <svg {...uiAttributes({ uid: "dev.monitor.page.svg.3-0heNOJ", id: "dev.monitor.page.svg.3" })} id="dev.monitor.page.svg" width="100%" height="400" style={{ minWidth: '800px' }}>
                  <defs {...uiAttributes({ uid: "dev.monitor.page.defs-K8TC4A", id: "dev.monitor.page.defs" })}>
                    <marker {...uiAttributes({ uid: "dev.monitor.page.marker-U5UEno", id: "dev.monitor.page.marker" })} id="arrow" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path {...uiAttributes({ uid: "dev.monitor.page.path-WtzdN8", id: "dev.monitor.page.path" })} d="M 0 0 L 10 5 L 0 10 z" fill="var(--border)" />
                    </marker>
                  </defs>
                  {(() => {
                    const columns: Record<LayerName, number> = {
                      ui: 50,
                      hook: 150,
                      service: 250,
                      'asol-api': 350,
                      query: 450,
                      repository: 550,
                      database: 650,
                      cache: 750,
                    };
                    const rowCounts: Record<string, number> = {};
                    const positions: Record<string, { x: number; y: number }> = {};

                    // Assign coordinates to nodes
                    callGraph.nodes.forEach((node) => {
                      const layer = node.layer;
                      if (rowCounts[layer] === undefined) rowCounts[layer] = 0;
                      const x = columns[layer] || 50;
                      const y = 40 + rowCounts[layer] * 60;
                      rowCounts[layer]++;
                      positions[node.id] = { x, y };
                    });

                    return (
                      <g {...uiAttributes({ uid: "dev.monitor.page.g-7TeI0M", id: "dev.monitor.page.g" })}>
                        {/* Draw connection edges */}
                        {callGraph.edges.map((edge, idx) => {
                          const start = positions[edge.from];
                          const end = positions[edge.to];
                          if (!start || !end) return null;
                          return (
                            <line
                              key={idx} {...uiAttributes({ uid: "dev.monitor.page.line-G3M32B", id: "dev.monitor.page.line" })}
                              x1={start.x}
                              y1={start.y}
                              x2={end.x}
                              y2={end.y}
                              stroke="var(--border)"
                              strokeWidth="2"
                              markerEnd="url(#arrow)"
                            />
                          );
                        })}

                        {/* Draw Nodes */}
                        {callGraph.nodes.map((node) => {
                          const pos = positions[node.id];
                          if (!pos) return null;
                          const color = LAYER_COLORS[node.layer] || '#64748b';
                          return (
                            <g
                              key={node.id} {...uiAttributes({ uid: "dev.monitor.page.g.2-0fwmtS", id: "dev.monitor.page.g.2" , instance: createOpaqueUiInstanceId("iter-97d0592892", String(node.id))})}
                              transform={`translate(${pos.x - 30}, ${pos.y - 20})`}
                              onClick={() => selectOperation(node.recordId)}
                            >
                              <rect {...uiAttributes({ uid: "dev.monitor.page.rect-Xm0M5L", id: "dev.monitor.page.rect" , instance: createOpaqueUiInstanceId("iter-6a2043cd42", String(node.id))})} width="60" height="40" rx="6" fill={color} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                              <text {...uiAttributes({ uid: "dev.monitor.page.text-mT96RO", id: "dev.monitor.page.text" , instance: createOpaqueUiInstanceId("iter-66a1c6f22b", String(node.id))})} x="30" y="24" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
                                {node.label.slice(0, 10)}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── TAB CONTENT: DEPENDENCY GRAPH ─── */}
      {activeTab === 'dependency' && (
        <section {...uiAttributes({ uid: "dev.monitor.page.section.13-IRQmP2", id: "dev.monitor.page.section.13" })} id="dev.monitor.page.section.5">
          <div {...uiAttributes({ uid: "dev.monitor.page.div.214-1baFL7", id: "dev.monitor.page.div.214" })} id="dev.monitor.page.div.81" className="svg-card">
            <div {...uiAttributes({ uid: "dev.monitor.page.div.215-0s345Q", id: "dev.monitor.page.div.215" })} id="dev.monitor.page.div.82" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>خريطة البنية: خدمة ➔ مستودع ➔ استعلام</div>
            {dependencyGraph.nodes.length === 0 ? (
              <div {...uiAttributes({ uid: "dev.monitor.page.div.216-Gdqce6", id: "dev.monitor.page.div.216" })} id="dev.monitor.page.div.83" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                لا توجد عمليات لرسم التبعيات. نفّذ بعض الطلبات أولاً.
              </div>
            ) : (
              <div {...uiAttributes({ uid: "dev.monitor.page.div.217-2vtauN", id: "dev.monitor.page.div.217" })} id="dev.monitor.page.div.84" style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <svg {...uiAttributes({ uid: "dev.monitor.page.svg.4-HeirM4", id: "dev.monitor.page.svg.4" })} id="dev.monitor.page.svg.2" width="100%" height="400" style={{ minWidth: '800px' }}>
                  <defs {...uiAttributes({ uid: "dev.monitor.page.defs.2-VY5y3o", id: "dev.monitor.page.defs.2" })}>
                    <marker {...uiAttributes({ uid: "dev.monitor.page.marker.2-WQ9EXD", id: "dev.monitor.page.marker.2" })} id="dep-arrow" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path {...uiAttributes({ uid: "dev.monitor.page.path.2-hQ9Cii", id: "dev.monitor.page.path.2" })} d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                    </marker>
                  </defs>
                  {(() => {
                    const columns = {
                      service: 100,
                      repository: 400,
                      query: 700,
                    };
                    const rowCounts: Record<string, number> = {};
                    const positions: Record<string, { x: number; y: number }> = {};

                    dependencyGraph.nodes.forEach((node) => {
                      const type = node.type;
                      if (rowCounts[type] === undefined) rowCounts[type] = 0;
                      const x = columns[type] || 100;
                      const y = 60 + rowCounts[type] * 80;
                      rowCounts[type]++;
                      positions[node.id] = { x, y };
                    });

                    return (
                      <g {...uiAttributes({ uid: "dev.monitor.page.g.3-kM1oHn", id: "dev.monitor.page.g.3" })}>
                        {dependencyGraph.edges.map((edge, idx) => {
                          const start = positions[edge.from];
                          const end = positions[edge.to];
                          if (!start || !end) return null;
                          return (
                            <path
                              key={idx} {...uiAttributes({ uid: "dev.monitor.page.path.3-ytW2tW", id: "dev.monitor.page.path.3" })}
                              d={`M ${start.x} ${start.y} C ${(start.x + end.x) / 2} ${start.y}, ${(start.x + end.x) / 2} ${end.y}, ${end.x} ${end.y}`}
                              stroke="#3b82f6"
                              strokeWidth="1.5"
                              fill="none"
                              markerEnd="url(#dep-arrow)"
                            />
                          );
                        })}

                        {dependencyGraph.nodes.map((node) => {
                          const pos = positions[node.id];
                          if (!pos) return null;
                          const color = node.type === 'service' ? '#22c55e' : node.type === 'repository' ? '#a855f7' : '#f97316';
                          return (
                            <g key={node.id} {...uiAttributes({ uid: "dev.monitor.page.g.4-5SH3LD", id: "dev.monitor.page.g.4" , instance: createOpaqueUiInstanceId("iter-eb5b28784a", String(node.id))})} transform={`translate(${pos.x - 75}, ${pos.y - 25})`}>
                              <rect {...uiAttributes({ uid: "dev.monitor.page.rect.2-zCJ99N", id: "dev.monitor.page.rect.2" , instance: createOpaqueUiInstanceId("iter-cfd9a9100a", String(node.id))})} width="150" height="50" rx="8" fill="var(--bg-card)" stroke={color} strokeWidth="2" />
                              <text {...uiAttributes({ uid: "dev.monitor.page.text.2-o8UsXK", id: "dev.monitor.page.text.2" , instance: createOpaqueUiInstanceId("iter-287b80e5e5", String(node.id))})} x="75" y="24" textAnchor="middle" fill="var(--text-main)" fontSize="10" fontWeight="bold">
                                {node.label.slice(0, 22)}
                              </text>
                              <text {...uiAttributes({ uid: "dev.monitor.page.text.3-KDKs4V", id: "dev.monitor.page.text.3" , instance: createOpaqueUiInstanceId("iter-7c53bed584", String(node.id))})} x="75" y="40" textAnchor="middle" fill="var(--text-muted)" fontSize="8">
                                العدد: {node.count}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── TAB CONTENT: ANALYTICS ─── */}
      {activeTab === 'analytics' && (
        <section {...uiAttributes({ uid: "dev.monitor.page.section.14-36PHwL", id: "dev.monitor.page.section.14" })} id="dev.monitor.page.section.6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div {...uiAttributes({ uid: "dev.monitor.page.div.218-irar2L", id: "dev.monitor.page.div.218" })} id="dev.monitor.page.div.85" className="detail-section">
            <div {...uiAttributes({ uid: "dev.monitor.page.div.219-W25T1f", id: "dev.monitor.page.div.219" })} id="dev.monitor.page.div.86" className="detail-section-title">أكثر الميزات نشاطاً</div>
            {stats.mostActiveFeatures.map((f, i) => (
              <div key={f.name} {...uiAttributes({ uid: "dev.monitor.page.div.220-z0npG2", id: "dev.monitor.page.div.220" , instance: createOpaqueUiInstanceId("iter-0274fd6f34", String(f.name))})} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.92-aE8ZFI", id: "dev.monitor.page.span.92" , instance: createOpaqueUiInstanceId("iter-03e725508c", String(f.name))})}>{i+1}. {f.name}</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.93-6CrKuE", id: "dev.monitor.page.span.93" , instance: createOpaqueUiInstanceId("iter-e59a9c76b6", String(f.name))})} style={{ fontWeight: 'bold' }}>{f.count} عملية</span>
              </div>
            ))}
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.221-4KTFLZ", id: "dev.monitor.page.div.221" })} id="dev.monitor.page.div.87" className="detail-section">
            <div {...uiAttributes({ uid: "dev.monitor.page.div.222-1qLJJ5", id: "dev.monitor.page.div.222" })} id="dev.monitor.page.div.88" className="detail-section-title">أكثر الصفحات نشاطاً</div>
            {stats.mostActivePages.map((p, i) => (
              <div key={p.name} {...uiAttributes({ uid: "dev.monitor.page.div.223-4m1bO9", id: "dev.monitor.page.div.223" , instance: createOpaqueUiInstanceId("iter-4302c7694d", String(p.name))})} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.94-2QQhtq", id: "dev.monitor.page.span.94" , instance: createOpaqueUiInstanceId("iter-d5779fca26", String(p.name))})}>{i+1}. {p.name}</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.95-0YWGkk", id: "dev.monitor.page.span.95" , instance: createOpaqueUiInstanceId("iter-1af70bba3c", String(p.name))})} style={{ fontWeight: 'bold' }}>{p.count} عملية</span>
              </div>
            ))}
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.224-gHl7Qq", id: "dev.monitor.page.div.224" })} id="dev.monitor.page.div.89" className="detail-section">
            <div {...uiAttributes({ uid: "dev.monitor.page.div.225-RDtE9a", id: "dev.monitor.page.div.225" })} id="dev.monitor.page.div.90" className="detail-section-title">أكثر الجداول نشاطاً</div>
            {stats.mostActiveTables.map((t, i) => (
              <div key={t.name} {...uiAttributes({ uid: "dev.monitor.page.div.226-p3tXB4", id: "dev.monitor.page.div.226" , instance: createOpaqueUiInstanceId("iter-1e08af9b5c", String(t.name))})} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.96-TdVb2E", id: "dev.monitor.page.span.96" , instance: createOpaqueUiInstanceId("iter-50442b4d77", String(t.name))})}>{i+1}. {t.name}</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.97-f9PB24", id: "dev.monitor.page.span.97" , instance: createOpaqueUiInstanceId("iter-3fdcd4c3b0", String(t.name))})} style={{ fontWeight: 'bold' }}>{t.count} عملية</span>
              </div>
            ))}
          </div>

          <div {...uiAttributes({ uid: "dev.monitor.page.div.227-ZmEC48", id: "dev.monitor.page.div.227" })} id="dev.monitor.page.div.91" className="detail-section">
            <div {...uiAttributes({ uid: "dev.monitor.page.div.228-34IWfS", id: "dev.monitor.page.div.228" })} id="dev.monitor.page.div.92" className="detail-section-title">أكثر المستودعات نشاطاً</div>
            {stats.mostActiveRepositories.map((r, i) => (
              <div key={r.name} {...uiAttributes({ uid: "dev.monitor.page.div.229-7moUgx", id: "dev.monitor.page.div.229" , instance: createOpaqueUiInstanceId("iter-28c5686363", String(r.name))})} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.98-CEG0xv", id: "dev.monitor.page.span.98" , instance: createOpaqueUiInstanceId("iter-8b5584bbb4", String(r.name))})}>{i+1}. {r.name}</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.99-HEM9jy", id: "dev.monitor.page.span.99" , instance: createOpaqueUiInstanceId("iter-407abd6d2c", String(r.name))})} style={{ fontWeight: 'bold' }}>{r.count} عملية</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── TAB CONTENT: SCHEMA SYNC ─── */}
      {activeTab === 'schema-sync' && (
        <section {...uiAttributes({ uid: "dev.monitor.page.section.15-u9Leq2", id: "dev.monitor.page.section.15" })} id="dev.monitor.page.section.7">
          <SchemaSyncPanel />
        </section>
      )}

      {/* ─── TAB CONTENT: PINNED ─── */}
      {activeTab === 'pinned' && (
        <section {...uiAttributes({ uid: "dev.monitor.page.section.16-F4c6I6", id: "dev.monitor.page.section.16" })} id="dev.monitor.page.section.8">
          <div {...uiAttributes({ uid: "dev.monitor.page.div.230-05Eefh", id: "dev.monitor.page.div.230" })} id="dev.monitor.page.div.93" className="operations-list-card" style={{ height: 'auto', minHeight: '300px' }}>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.231-BVzu2b", id: "dev.monitor.page.div.231" })} id="dev.monitor.page.div.94" className="card-header">
              <h2 {...uiAttributes({ uid: "dev.monitor.page.h2.4-hp0nHF", id: "dev.monitor.page.h2.4" })} id="dev.monitor.page.h2.2" style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>📌 العمليات المثبتة</h2>
            </div>
            <div {...uiAttributes({ uid: "dev.monitor.page.div.232-zpKE9w", id: "dev.monitor.page.div.232" })} id="dev.monitor.page.div.95" className="scrollable-area">
              {operations.filter((o) => o.pinned).length === 0 ? (
                <div {...uiAttributes({ uid: "dev.monitor.page.div.233-MiRK8Q", id: "dev.monitor.page.div.233" })} id="dev.monitor.page.div.96" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  لا توجد عمليات مثبتة. مرّر فوق عنصر في التتبع واضغط ⭐ للتثبيت.
                </div>
              ) : (
                operations.filter((o) => o.pinned).map((op) => (
                  <div key={op.id} {...uiAttributes({ uid: "dev.monitor.page.div.234-J0EUPX", id: "dev.monitor.page.div.234" , instance: createOpaqueUiInstanceId("iter-beeb426e30", String(op.id))})} className="tree-node-row" onClick={() => selectOperation(op.id)}>
                    <div {...uiAttributes({ uid: "dev.monitor.page.div.235-KGQD82", id: "dev.monitor.page.div.235" , instance: createOpaqueUiInstanceId("iter-e2bf4c8b38", String(op.id))})} className="tree-node-info">
                      <div {...uiAttributes({ uid: "dev.monitor.page.div.236-M0KRKu", id: "dev.monitor.page.div.236" , instance: createOpaqueUiInstanceId("iter-44f5ed690b", String(op.id))})} className="layer-dot" style={{ background: op.table ? LAYER_COLORS.database : LAYER_COLORS.hook }} />
                      <span {...uiAttributes({ uid: "dev.monitor.page.span.100-EJ0PwH", id: "dev.monitor.page.span.100" , instance: createOpaqueUiInstanceId("iter-73bce38833", String(op.id))})} style={{ fontWeight: 600 }}>{op.table ? `${op.operationType} ${op.table}` : op.queryKey || op.id}</span>
                      <span {...uiAttributes({ uid: "dev.monitor.page.span.101-4zZanM", id: "dev.monitor.page.span.101" , instance: createOpaqueUiInstanceId("iter-ef721c3e6d", String(op.id))})} style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({op.feature})</span>
                    </div>
                    <button {...uiAttributes({ uid: "dev.monitor.page.button.20-440V0k", id: "dev.monitor.page.button.20" , instance: createOpaqueUiInstanceId("iter-0766361fce", String(op.id))})}
                      className="btn"
                      style={{ padding: '2px 8px', fontSize: '10px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(op.id);
                      }}
                    >
                      ⭐ إلغاء التثبيت
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── OPERATION DETAILS DRAWER ─── */}
      <div {...uiAttributes({ uid: "dev.monitor.page.div.237-nCWyT0", id: "dev.monitor.page.div.237" })} id="dev.monitor.page.div.97" className={`drawer ${activeOp ? 'open' : ''}`}>
        <div {...uiAttributes({ uid: "dev.monitor.page.div.238-6a4jwN", id: "dev.monitor.page.div.238" })} id="dev.monitor.page.div.98" className="drawer-header">
          <span {...uiAttributes({ uid: "dev.monitor.page.span.102-G9m4hI", id: "dev.monitor.page.span.102" })} id="dev.monitor.page.span.30" className="drawer-title">تفاصيل العملية</span>
          <button {...uiAttributes({ uid: "dev.monitor.page.button.21-Kn6cnt", id: "dev.monitor.page.button.21" })} id="dev.monitor.page.button.9" className="btn" onClick={() => selectOperation(null)}>✕ إغلاق</button>
        </div>

        {activeOp && (
          <div {...uiAttributes({ uid: "dev.monitor.page.div.239-7BaOgW", id: "dev.monitor.page.div.239" })} id="dev.monitor.page.div.99" className="drawer-body">
            <div {...uiAttributes({ uid: "dev.monitor.page.div.240-4X3Dh7", id: "dev.monitor.page.div.240" })} id="dev.monitor.page.div.100" className="detail-section">
              <div {...uiAttributes({ uid: "dev.monitor.page.div.241-1At58P", id: "dev.monitor.page.div.241" })} id="dev.monitor.page.div.101" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.103-N94TPQ", id: "dev.monitor.page.span.103" })} id="dev.monitor.page.span.31" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {activeOp.table ? `${activeOp.operationType} ${activeOp.table}` : activeOp.queryKey || 'استعلام'}
                </span>
                <button {...uiAttributes({ uid: "dev.monitor.page.button.22-YAuS36", id: "dev.monitor.page.button.22" })} id="dev.monitor.page.button.10"
                  className="btn"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => togglePin(activeOp.id)}
                >
                  {activeOp.pinned ? '⭐ مثبّت' : '☆ تثبيت في الأعلى'}
                </button>
              </div>
            </div>

            <div {...uiAttributes({ uid: "dev.monitor.page.div.242-9chCZR", id: "dev.monitor.page.div.242" })} id="dev.monitor.page.div.102" className="detail-section">
              <div {...uiAttributes({ uid: "dev.monitor.page.div.243-K49EJe", id: "dev.monitor.page.div.243" })} id="dev.monitor.page.div.103" className="detail-section-title">معلومات التتبع</div>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.244-K0UaR3", id: "dev.monitor.page.div.244" })} id="dev.monitor.page.div.104" className="info-grid">
                <span {...uiAttributes({ uid: "dev.monitor.page.span.104-8hJAbZ", id: "dev.monitor.page.span.104" })} id="dev.monitor.page.span.32" className="info-label">معرّف الارتباط:</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.105-DwLSD7", id: "dev.monitor.page.span.105" })} id="dev.monitor.page.span.33" className="info-value" style={{ fontFamily: 'monospace' }}>{activeOp.correlationId.slice(0, 16)}</span>

                <span {...uiAttributes({ uid: "dev.monitor.page.span.106-H3dBZK", id: "dev.monitor.page.span.106" })} id="dev.monitor.page.span.34" className="info-label">معرّف التدفق:</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.107-xw0yX5", id: "dev.monitor.page.span.107" })} id="dev.monitor.page.span.35" className="info-value" style={{ fontFamily: 'monospace' }}>{activeOp.requestFlowId.slice(0, 16)}</span>

                <span {...uiAttributes({ uid: "dev.monitor.page.span.108-1sGCRK", id: "dev.monitor.page.span.108" })} id="dev.monitor.page.span.36" className="info-label">الميزة:</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.109-roTfD8", id: "dev.monitor.page.span.109" })} id="dev.monitor.page.span.37" className="info-value">{activeOp.feature}</span>

                <span {...uiAttributes({ uid: "dev.monitor.page.span.110-6PPPMo", id: "dev.monitor.page.span.110" })} id="dev.monitor.page.span.38" className="info-label">مسار الصفحة:</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.111-3APKAq", id: "dev.monitor.page.span.111" })} id="dev.monitor.page.span.39" className="info-value">{activeOp.page}</span>

                <span {...uiAttributes({ uid: "dev.monitor.page.span.112-wT6hW2", id: "dev.monitor.page.span.112" })} id="dev.monitor.page.span.40" className="info-label">الخطاف:</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.113-cJuTf4", id: "dev.monitor.page.span.113" })} id="dev.monitor.page.span.41" className="info-value">{activeOp.hook}</span>

                <span {...uiAttributes({ uid: "dev.monitor.page.span.114-2FZSR2", id: "dev.monitor.page.span.114" })} id="dev.monitor.page.span.42" className="info-label">الخدمة:</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.115-GCd5Nl", id: "dev.monitor.page.span.115" })} id="dev.monitor.page.span.43" className="info-value">{activeOp.service}</span>

                <span {...uiAttributes({ uid: "dev.monitor.page.span.116-B96IJo", id: "dev.monitor.page.span.116" })} id="dev.monitor.page.span.44" className="info-label">المستودع:</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.117-iKrO6R", id: "dev.monitor.page.span.117" })} id="dev.monitor.page.span.45" className="info-value">{activeOp.repository}</span>

                <span {...uiAttributes({ uid: "dev.monitor.page.span.118-3vWrPB", id: "dev.monitor.page.span.118" })} id="dev.monitor.page.span.46" className="info-label">محرك قاعدة البيانات:</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.119-qOIc0p", id: "dev.monitor.page.span.119" })} id="dev.monitor.page.span.47" className="info-value" style={{ color: activeOp.dbDriver === 'Turso-Production' ? '#ef4444' : '#22c55e' }}>
                  {activeOp.dbDriver}
                </span>

                <span {...uiAttributes({ uid: "dev.monitor.page.span.120-PDd1iO", id: "dev.monitor.page.span.120" })} id="dev.monitor.page.span.48" className="info-label">الحالة:</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.121-EX3AA4", id: "dev.monitor.page.span.121" })} id="dev.monitor.page.span.49" className="info-value" style={{ color: STATUS_COLORS[activeOp.status] }}>
                  {activeOp.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div {...uiAttributes({ uid: "dev.monitor.page.div.245-P2CC6V", id: "dev.monitor.page.div.245" })} id="dev.monitor.page.div.105" className="detail-section">
              <div {...uiAttributes({ uid: "dev.monitor.page.div.246-FbL7f1", id: "dev.monitor.page.div.246" })} id="dev.monitor.page.div.106" className="detail-section-title">مقاييس الأداء</div>
              <div {...uiAttributes({ uid: "dev.monitor.page.div.247-zrL71C", id: "dev.monitor.page.div.247" })} id="dev.monitor.page.div.107" className="info-grid">
                <span {...uiAttributes({ uid: "dev.monitor.page.span.122-1PDlko", id: "dev.monitor.page.span.122" })} id="dev.monitor.page.span.50" className="info-label">مدة التنفيذ:</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.123-2QtZRI", id: "dev.monitor.page.span.123" })} id="dev.monitor.page.span.51" className="info-value" style={{ color: activeOp.executionTime > SLOW_QUERY_THRESHOLD_MS ? '#ef4444' : '#22c55e', fontWeight: 800 }}>
                  {activeOp.executionTime} ms
                </span>

                <span {...uiAttributes({ uid: "dev.monitor.page.span.124-OI6yJ0", id: "dev.monitor.page.span.124" })} id="dev.monitor.page.span.52" className="info-label">فرق الذاكرة:</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.125-c0Ne2b", id: "dev.monitor.page.span.125" })} id="dev.monitor.page.span.53" className="info-value">
                  {activeOp.memoryDelta != null
                    ? `${(activeOp.memoryDelta / 1024).toFixed(2)} KB`
                    : 'غير متاح (Performance.memory معطّل)'}
                </span>

                <span {...uiAttributes({ uid: "dev.monitor.page.span.126-TYhX8g", id: "dev.monitor.page.span.126" })} id="dev.monitor.page.span.54" className="info-label">صفوف مقروءة:</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.127-LFrL1T", id: "dev.monitor.page.span.127" })} id="dev.monitor.page.span.55" className="info-value">{activeOp.rowsRead}</span>

                <span {...uiAttributes({ uid: "dev.monitor.page.span.128-y8otCO", id: "dev.monitor.page.span.128" })} id="dev.monitor.page.span.56" className="info-label">صفوف مكتوبة:</span>
                <span {...uiAttributes({ uid: "dev.monitor.page.span.129-5SD2NT", id: "dev.monitor.page.span.129" })} id="dev.monitor.page.span.57" className="info-value">{activeOp.rowsWritten}</span>
              </div>
            </div>

            {activeOp.httpRoute && (
              <div {...uiAttributes({ uid: "dev.monitor.page.div.248-W5JaZa", id: "dev.monitor.page.div.248" })} id="dev.monitor.page.div.108" className="detail-section">
                <div {...uiAttributes({ uid: "dev.monitor.page.div.249-QEN5i4", id: "dev.monitor.page.div.249" })} id="dev.monitor.page.div.109" className="detail-section-title">طلب HTTP (AsolApiClient)</div>
                <pre {...uiAttributes({ uid: "dev.monitor.page.pre-7Cm49Z", id: "dev.monitor.page.pre" })} className="code-block">{`${activeOp.httpMethod ?? 'GET'} ${activeOp.httpRoute}`}</pre>
              </div>
            )}

            {activeOp.sql && (
              <div {...uiAttributes({ uid: "dev.monitor.page.div.250-8Sm2r3", id: "dev.monitor.page.div.250" })} id="dev.monitor.page.div.110" className="detail-section">
                <div {...uiAttributes({ uid: "dev.monitor.page.div.251-55UmDq", id: "dev.monitor.page.div.251" })} id="dev.monitor.page.div.111" className="detail-section-title">SQL المنفّذ</div>
                <pre {...uiAttributes({ uid: "dev.monitor.page.pre.2-OFN03I", id: "dev.monitor.page.pre.2" })} className="code-block">{activeOp.sql}</pre>
                {activeOp.params && activeOp.params.length > 0 && (
                  <div {...uiAttributes({ uid: "dev.monitor.page.div.252-PmZ5EQ", id: "dev.monitor.page.div.252" })} id="dev.monitor.page.div.112" style={{ marginTop: '8px' }}>
                    <div {...uiAttributes({ uid: "dev.monitor.page.div.253-7x94BE", id: "dev.monitor.page.div.253" })} id="dev.monitor.page.div.113" className="detail-section-title">معاملات الاستعلام</div>
                    <pre {...uiAttributes({ uid: "dev.monitor.page.pre.3-8aZePJ", id: "dev.monitor.page.pre.3" })} className="code-block">{JSON.stringify(activeOp.params, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {diffResult && (
              <div {...uiAttributes({ uid: "dev.monitor.page.div.254-ZNYsM8", id: "dev.monitor.page.div.254" })} id="dev.monitor.page.div.114" className="detail-section">
                <div {...uiAttributes({ uid: "dev.monitor.page.div.255-0COBTv", id: "dev.monitor.page.div.255" })} id="dev.monitor.page.div.115" className="detail-section-title">فرق نتيجة الاستعلام (قبل ➔ بعد)</div>
                <div {...uiAttributes({ uid: "dev.monitor.page.div.256-Lj9nO3", id: "dev.monitor.page.div.256" })} id="dev.monitor.page.div.116" style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', overflowX: 'auto', maxHeight: '250px' }}>
                  {diffResult.map((line, idx) => (
                    <span
                      key={idx} {...uiAttributes({ uid: "dev.monitor.page.span.130-8J7UxS", id: "dev.monitor.page.span.130" })}
                      className={`diff-line ${line.type === 'added' ? 'diff-added' : line.type === 'removed' ? 'diff-removed' : ''}`}
                    >
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ''} {line.text}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeOp.errorMessage && (
              <div {...uiAttributes({ uid: "dev.monitor.page.div.257-Cm6OGy", id: "dev.monitor.page.div.257" })} id="dev.monitor.page.div.117" className="detail-section" style={{ borderColor: '#ef4444' }}>
                <div {...uiAttributes({ uid: "dev.monitor.page.div.258-zVknN5", id: "dev.monitor.page.div.258" })} id="dev.monitor.page.div.118" className="detail-section-title" style={{ color: '#ef4444' }}>رسالة الخطأ</div>
                <div {...uiAttributes({ uid: "dev.monitor.page.div.259-0kJV3O", id: "dev.monitor.page.div.259" })} id="dev.monitor.page.div.119" style={{ color: '#f87171', fontSize: '13px', fontWeight: 600 }}>{activeOp.errorMessage}</div>
                {activeOp.executionStack && (
                  <div {...uiAttributes({ uid: "dev.monitor.page.div.260-1K9IwR", id: "dev.monitor.page.div.260" })} id="dev.monitor.page.div.120" style={{ marginTop: '8px' }}>
                    <div {...uiAttributes({ uid: "dev.monitor.page.div.261-hAP8Sb", id: "dev.monitor.page.div.261" })} id="dev.monitor.page.div.121" className="detail-section-title" style={{ color: '#ef4444' }}>تتبع تنفيذ الخطأ</div>
                    <pre {...uiAttributes({ uid: "dev.monitor.page.pre.4-fvZ5OR", id: "dev.monitor.page.pre.4" })} className="code-block" style={{ color: '#f87171', background: '#181111' }}>{activeOp.executionStack}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

