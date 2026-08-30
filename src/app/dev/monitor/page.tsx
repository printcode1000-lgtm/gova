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
    <div id="dev.monitor.page.div" className="monitor-container" dir="rtl">
      {/* Dynamic Theme Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
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
      <header id="dev.monitor.page.header" className="header no-print">
        <div id="dev.monitor.page.div.2" className="header-title">
          <h1 id="dev.monitor.page.h1">مراقب عمليات ASOL</h1>
          {isLive && <span id="dev.monitor.page.span" className="badge-live">مراقبة مباشرة</span>}
        </div>
        <div id="dev.monitor.page.div.3" className="header-actions">
          <button id="dev.monitor.page.button" className="btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ الوضع الفاتح' : '🌙 الوضع الداكن'}
          </button>
          <button id="dev.monitor.page.button.2" className="btn" onClick={toggleLive}>
            {isLive ? '⏸️ إيقاف البث' : '▶️ استئناف البث'}
          </button>
          <button id="dev.monitor.page.button.3" className="btn" onClick={clear}>
            🗑️ مسح السجلات
          </button>
          <button id="dev.monitor.page.button.4" className="btn" onClick={exportJSON}>
            📥 تصدير JSON
          </button>
          <button id="dev.monitor.page.button.5" className="btn" onClick={exportHTML}>
            📄 تصدير HTML
          </button>
          <button id="dev.monitor.page.button.6" className="btn" onClick={exportPDF}>
            🖨️ طباعة PDF
          </button>
        </div>
      </header>

      {/* ─── TABS ─── */}
      <nav id="dev.monitor.page.nav" className="tabs no-print">
        {MONITOR_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ─── FILTERS ─── */}
      <div id="dev.monitor.page.div.4" className="filters-panel no-print">
        <div id="dev.monitor.page.div.5" className="filters-grid">
          <div id="dev.monitor.page.div.6" className="filter-group">
            <label id="dev.monitor.page.label">الميزة</label>
            <select id="dev.monitor.page.select"
              className="filter-input"
              value={filter.feature}
              onChange={(e) => setFilter({ feature: e.target.value })}
            >
              <option value="">كل الميزات</option>
              {filterOptions.features.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div id="dev.monitor.page.div.7" className="filter-group">
            <label id="dev.monitor.page.label.2">الصفحة</label>
            <select id="dev.monitor.page.select.2"
              className="filter-input"
              value={filter.page}
              onChange={(e) => setFilter({ page: e.target.value })}
            >
              <option value="">كل الصفحات</option>
              {filterOptions.pages.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div id="dev.monitor.page.div.8" className="filter-group">
            <label id="dev.monitor.page.label.3">المكوّن</label>
            <select id="dev.monitor.page.select.3"
              className="filter-input"
              value={filter.component}
              onChange={(e) => setFilter({ component: e.target.value })}
            >
              <option value="">كل المكوّنات</option>
              {filterOptions.components.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div id="dev.monitor.page.div.9" className="filter-group">
            <label id="dev.monitor.page.label.4">الخطاف</label>
            <select id="dev.monitor.page.select.4"
              className="filter-input"
              value={filter.hook}
              onChange={(e) => setFilter({ hook: e.target.value })}
            >
              <option value="">كل الخطافات</option>
              {filterOptions.hooks.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div id="dev.monitor.page.div.10" className="filter-group">
            <label id="dev.monitor.page.label.5">الخدمة</label>
            <select id="dev.monitor.page.select.5"
              className="filter-input"
              value={filter.service}
              onChange={(e) => setFilter({ service: e.target.value })}
            >
              <option value="">كل الخدمات</option>
              {filterOptions.services.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div id="dev.monitor.page.div.11" className="filter-group">
            <label id="dev.monitor.page.label.6">المستودع</label>
            <select id="dev.monitor.page.select.6"
              className="filter-input"
              value={filter.repository}
              onChange={(e) => setFilter({ repository: e.target.value })}
            >
              <option value="">كل المستودعات</option>
              {filterOptions.repositories.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div id="dev.monitor.page.div.12" className="filter-group">
            <label id="dev.monitor.page.label.7">الجدول</label>
            <select id="dev.monitor.page.select.7"
              className="filter-input"
              value={filter.table}
              onChange={(e) => setFilter({ table: e.target.value })}
            >
              <option value="">كل الجداول</option>
              {filterOptions.tables.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div id="dev.monitor.page.div.13" className="filter-group">
            <label id="dev.monitor.page.label.8">الكيان</label>
            <select id="dev.monitor.page.select.8"
              className="filter-input"
              value={filter.entity}
              onChange={(e) => setFilter({ entity: e.target.value })}
            >
              <option value="">كل الكيانات</option>
              {filterOptions.entities.map((ent) => <option key={ent} value={ent}>{ent}</option>)}
            </select>
          </div>

          <div id="dev.monitor.page.div.14" className="filter-group">
            <label id="dev.monitor.page.label.9">مفتاح الاستعلام</label>
            <select id="dev.monitor.page.select.9"
              className="filter-input"
              value={filter.queryKey}
              onChange={(e) => setFilter({ queryKey: e.target.value })}
            >
              <option value="">كل مفاتيح الاستعلام</option>
              {filterOptions.queryKeys.map((qk) => <option key={qk} value={qk}>{qk}</option>)}
            </select>
          </div>

          <div id="dev.monitor.page.div.15" className="filter-group">
            <label id="dev.monitor.page.label.10">نوع العملية</label>
            <select id="dev.monitor.page.select.10"
              className="filter-input"
              value={filter.operationType}
              onChange={(e) => setFilter({ operationType: e.target.value })}
            >
              <option value="">كل الأنواع</option>
              <option value="SELECT">SELECT</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div id="dev.monitor.page.div.16" className="filter-group">
            <label id="dev.monitor.page.label.11">الحالة</label>
            <select id="dev.monitor.page.select.11"
              className="filter-input"
              value={filter.status}
              onChange={(e) => setFilter({ status: e.target.value })}
            >
              <option value="">كل الحالات</option>
              <option value="success">نجاح</option>
              <option value="pending">قيد التنفيذ</option>
              <option value="error">خطأ</option>
            </select>
          </div>

          <div id="dev.monitor.page.div.17" className="filter-group">
            <label id="dev.monitor.page.label.12">محرك قاعدة البيانات</label>
            <select id="dev.monitor.page.select.12"
              className="filter-input"
              value={filter.dbDriver}
              onChange={(e) => setFilter({ dbDriver: e.target.value })}
            >
              <option value="">كل المحركات</option>
              <option value="SQLite-Dev">SQLite للتطوير</option>
              <option value="Turso-Production">Turso للإنتاج</option>
            </select>
          </div>

          <div id="dev.monitor.page.div.18" className="filter-group">
            <label id="dev.monitor.page.label.13">مصدر الذاكرة المؤقتة</label>
            <select id="dev.monitor.page.select.13"
              className="filter-input"
              value={filter.cacheSource}
              onChange={(e) => setFilter({ cacheSource: e.target.value })}
            >
              <option value="">كل مصادر الذاكرة المؤقتة</option>
              <option value="Memory">ذاكرة مؤقتة RAM</option>
              <option value="IndexedDB">IndexedDB</option>
              <option value="HTTP">HTTP (AsolApiClient)</option>
              <option value="Database">مصدر قاعدة البيانات</option>
            </select>
          </div>
        </div>

        <div id="dev.monitor.page.div.19" className="search-bar">
          <input id="dev.monitor.page.input"
            className="filter-input search-input"
            placeholder="ابحث في الميزات أو SQL أو الخطافات أو مفاتيح الاستعلام أو رسائل الخطأ..."
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
          />
          <button id="dev.monitor.page.button.7" className="btn" onClick={resetFilter}>إعادة ضبط الفلاتر</button>
        </div>
      </div>

      {/* ─── TAB CONTENT: DASHBOARD ─── */}
      {activeTab === 'dashboard' && (
        <section id="dev.monitor.page.section">
          <div id="dev.monitor.page.div.20" className="stats-grid">
            <div id="dev.monitor.page.div.21" className="stat-card">
              <span id="dev.monitor.page.span.2" className="stat-title">إجمالي العمليات</span>
              <span id="dev.monitor.page.span.3" className="stat-value">{filteredOps.length}</span>
              <div id="dev.monitor.page.div.22" className="card-accent" style={{ '--accent': '#3b82f6' } as any} />
            </div>
            <div id="dev.monitor.page.div.23" className="stat-card">
              <span id="dev.monitor.page.span.4" className="stat-title">قراءات (SELECT)</span>
              <span id="dev.monitor.page.span.5" className="stat-value">{stats.totalReads}</span>
              <div id="dev.monitor.page.div.24" className="card-accent" style={{ '--accent': '#22c55e' } as any} />
            </div>
            <div id="dev.monitor.page.div.25" className="stat-card">
              <span id="dev.monitor.page.span.6" className="stat-title">كتابات (MUTATIONS)</span>
              <span id="dev.monitor.page.span.7" className="stat-value">{stats.totalWrites}</span>
              <div id="dev.monitor.page.div.26" className="card-accent" style={{ '--accent': '#ef4444' } as any} />
            </div>
            <div id="dev.monitor.page.div.27" className="stat-card">
              <span id="dev.monitor.page.span.8" className="stat-title">إجمالي استدعاءات قاعدة البيانات</span>
              <span id="dev.monitor.page.span.9" className="stat-value">{stats.totalDbCalls}</span>
              <div id="dev.monitor.page.div.28" className="card-accent" style={{ '--accent': '#a855f7' } as any} />
            </div>
            <div id="dev.monitor.page.div.29" className="stat-card">
              <span id="dev.monitor.page.span.10" className="stat-title">إصابات الذاكرة المؤقتة</span>
              <span id="dev.monitor.page.span.11" className="stat-value">{stats.totalCacheHits}</span>
              <div id="dev.monitor.page.div.30" className="card-accent" style={{ '--accent': '#eab308' } as any} />
            </div>
            <div id="dev.monitor.page.div.31" className="stat-card">
              <span id="dev.monitor.page.span.12" className="stat-title">إخفاقات الذاكرة المؤقتة</span>
              <span id="dev.monitor.page.span.13" className="stat-value">{stats.totalCacheMisses}</span>
              <div id="dev.monitor.page.div.32" className="card-accent" style={{ '--accent': '#a855f7' } as any} />
            </div>
            <div id="dev.monitor.page.div.33" className="stat-card">
              <span id="dev.monitor.page.span.14" className="stat-title">نسبة إصابة الذاكرة المؤقتة</span>
              <span id="dev.monitor.page.span.15" className="stat-value">{stats.cacheHitRate}%</span>
              <div id="dev.monitor.page.div.34" className="card-accent" style={{ '--accent': '#eab308' } as any} />
            </div>
            <div id="dev.monitor.page.div.35" className="stat-card">
              <span id="dev.monitor.page.span.16" className="stat-title">استعلامات نشطة</span>
              <span id="dev.monitor.page.span.17" className="stat-value">{stats.activeQueries}</span>
              <div id="dev.monitor.page.div.36" className="card-accent" style={{ '--accent': '#06b6d4' } as any} />
            </div>
            <div id="dev.monitor.page.div.37" className="stat-card">
              <span id="dev.monitor.page.span.18" className="stat-title">تعديلات نشطة</span>
              <span id="dev.monitor.page.span.19" className="stat-value">{stats.activeMutations}</span>
              <div id="dev.monitor.page.div.38" className="card-accent" style={{ '--accent': '#f97316' } as any} />
            </div>
            <div id="dev.monitor.page.div.39" className="stat-card">
              <span id="dev.monitor.page.span.20" className="stat-title">قراءات دون اتصال</span>
              <span id="dev.monitor.page.span.21" className="stat-value">{stats.offlineReads}</span>
              <div id="dev.monitor.page.div.40" className="card-accent" style={{ '--accent': '#64748b' } as any} />
            </div>
            <div id="dev.monitor.page.div.41" className="stat-card">
              <span id="dev.monitor.page.span.22" className="stat-title">قراءات متصلة</span>
              <span id="dev.monitor.page.span.23" className="stat-value">{stats.onlineReads}</span>
              <div id="dev.monitor.page.div.42" className="card-accent" style={{ '--accent': '#3b82f6' } as any} />
            </div>
            <div id="dev.monitor.page.div.43" className="stat-card">
              <span id="dev.monitor.page.span.24" className="stat-title">متوسط زمن قاعدة البيانات</span>
              <span id="dev.monitor.page.span.25" className="stat-value">{stats.avgExecutionTime} ms</span>
              <div id="dev.monitor.page.div.44" className="card-accent" style={{ '--accent': '#ef4444' } as any} />
            </div>
            <div id="dev.monitor.page.div.45" className="stat-card alert">
              <span id="dev.monitor.page.span.26" className="stat-title">تنبيهات N+1</span>
              <span id="dev.monitor.page.span.27" className="stat-value" style={{ color: '#f97316' }}>{stats.n1Alerts}</span>
              <div id="dev.monitor.page.div.46" className="card-accent" style={{ '--accent': '#f97316' } as any} />
            </div>
            <div id="dev.monitor.page.div.47" className="stat-card error">
              <span id="dev.monitor.page.span.28" className="stat-title">استعلامات مكررة</span>
              <span id="dev.monitor.page.span.29" className="stat-value" style={{ color: '#ef4444' }}>{stats.duplicateAlerts}</span>
              <div id="dev.monitor.page.div.48" className="card-accent" style={{ '--accent': '#ef4444' } as any} />
            </div>
          </div>

          <div id="dev.monitor.page.div.49" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div id="dev.monitor.page.div.50" className="detail-section">
              <div id="dev.monitor.page.div.51" className="detail-section-title">أبطأ عمليات قاعدة البيانات</div>
              {stats.slowestOps.length === 0 ? (
                <div id="dev.monitor.page.div.52" style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px' }}>لا توجد استعلامات مسجّلة.</div>
              ) : (
                <table id="dev.monitor.page.table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead id="dev.monitor.page.thead">
                    <tr id="dev.monitor.page.tr" style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th id="dev.monitor.page.th" style={{ padding: '6px' }}>الجدول</th>
                      <th id="dev.monitor.page.th.2" style={{ padding: '6px' }}>العملية</th>
                      <th id="dev.monitor.page.th.3" style={{ padding: '6px', textAlign: 'right' }}>المدة (ms)</th>
                    </tr>
                  </thead>
                  <tbody id="dev.monitor.page.tbody">
                    {stats.slowestOps.map((op) => (
                      <tr key={op.id} style={{ borderBottom: '1px solid var(--border)' }} onClick={() => selectOperation(op.id)}>
                        <td style={{ padding: '6px', fontWeight: 600 }}>{op.table}</td>
                        <td style={{ padding: '6px' }}><span style={{ color: OP_TYPE_COLORS[op.operationType] }}>{op.operationType}</span></td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700, color: op.executionTime > SLOW_QUERY_THRESHOLD_MS ? '#ef4444' : 'var(--text-main)' }}>{op.executionTime} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div id="dev.monitor.page.div.53" className="detail-section">
              <div id="dev.monitor.page.div.54" className="detail-section-title">تحذيرات N+1 / التكرار</div>
              <div id="dev.monitor.page.div.55" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredOps.filter(o => o.isDuplicate || o.isN1).length === 0 ? (
                  <div id="dev.monitor.page.div.56" style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px' }}>لا توجد مشاكل N+1 أو تكرار.</div>
                ) : (
                  filteredOps.filter(o => o.isDuplicate || o.isN1).map((op) => (
                    <div key={op.id} className="tree-node-row" onClick={() => selectOperation(op.id)} style={{ borderLeft: op.isDuplicate ? '3px solid #ef4444' : '3px solid #f97316', paddingLeft: '8px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>التدفق: {op.requestFlowId.slice(0, 8)}…</div>
                        <div style={{ fontWeight: 600 }}>{op.operationType} {op.table}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {op.isDuplicate && <span style={{ background: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>مكرر</span>}
                        {op.isN1 && <span style={{ background: '#f97316', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>تنبيه N+1</span>}
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
        <section id="dev.monitor.page.section.2" className="ops-panel">
          <div id="dev.monitor.page.div.57" className="operations-list-card">
            <div id="dev.monitor.page.div.58" className="card-header">
              <h2 id="dev.monitor.page.h2" style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>تتبع العمليات (شجرة التدفق)</h2>
              <div id="dev.monitor.page.div.59" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label id="dev.monitor.page.label.14" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input id="dev.monitor.page.input.2"
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                  />
                  📌 تمرير تلقائي
                </label>
                {!autoScroll && (
                  <button id="dev.monitor.page.button.8" className="btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setAutoScroll(true)}>
                    إعادة تفعيل التمرير التلقائي
                  </button>
                )}
              </div>
            </div>

            <div id="dev.monitor.page.div.60" className="scrollable-area" ref={listContainerRef} onScroll={handleScroll}>
              {treeData.length === 0 ? (
                <div id="dev.monitor.page.div.61" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
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

          <div id="dev.monitor.page.div.62" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div id="dev.monitor.page.div.63" className="detail-section">
              <div id="dev.monitor.page.div.64" className="detail-section-title">كيفية تفعيل التتبع</div>
              <div id="dev.monitor.page.div.65" style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <ol id="dev.monitor.page.ol" style={{ paddingLeft: '16px', margin: '4px 0' }}>
                  <li id="dev.monitor.page.li">انتقل إلى صفحات المصادقة (تسجيل الدخول أو التسجيل).</li>
                  <li id="dev.monitor.page.li.2">اضغط الأزرار أو املأ النماذج لتفعيل استدعاءات قاعدة البيانات والذاكرة المؤقتة.</li>
                  <li id="dev.monitor.page.li.3">ستظهر العمليات هنا مباشرة في الوقت الفعلي.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── TAB CONTENT: TIMELINE / FLAME CHART ─── */}
      {activeTab === 'timeline' && (
        <section id="dev.monitor.page.section.3">
          <div id="dev.monitor.page.div.66" className="detail-section" style={{ marginBottom: '16px' }}>
            <label id="dev.monitor.page.label.15" style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>اختر تدفق الطلب لعرض الخط الزمني:</label>
            <select id="dev.monitor.page.select.14"
              className="filter-input"
              style={{ width: '100%', maxWidth: '400px' }}
              value={selectedFlowId}
              onChange={(e) => setSelectedFlowId(e.target.value)}
            >
              {flows.map((f) => (
                <option key={f.id} value={f.id}>
                  تدفق {f.id.slice(0, 8)}… ({f.feature}) — {formatAdminClock(f.timestamp, { seconds: true })}
                </option>
              ))}
            </select>
          </div>

          {selectedFlowId && flowOps.length > 0 ? (
            <div id="dev.monitor.page.div.67">
              <div id="dev.monitor.page.div.68" className="flame-chart-container">
                <div id="dev.monitor.page.div.69" style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  Flame Chart (مخطط جانت للطبقات)
                </div>
                <div id="dev.monitor.page.div.70" className="flame-chart">
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
                      <div className="flame-row" key={layer}>
                        <div className="flame-row-label">{layer}</div>
                        <div className="flame-bars-container">
                          {layerItems.map((item) => {
                            const left = ((item.startedAt - flowStart) / totalDuration) * 100;
                            const width = Math.max(((item.completedAt - item.startedAt) / totalDuration) * 100, 1.5);
                            return (
                              <div
                                key={item.id}
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
              <div id="dev.monitor.page.div.71" className="detail-section">
                <div id="dev.monitor.page.div.72" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div id="dev.monitor.page.div.73" style={{ fontSize: '14px', fontWeight: 700 }}>إعادة تشغيل الخط الزمني</div>
                  <div id="dev.monitor.page.div.74" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    الخطوة {replayIndex} من {flowOps.length}
                  </div>
                </div>

                <input id="dev.monitor.page.input.3"
                  type="range"
                  min="0"
                  max={flowOps.length}
                  value={replayIndex}
                  onChange={(e) => setReplayIndex(Number(e.target.value))}
                  style={{ width: '100%', marginBottom: '16px' }}
                />

                <div id="dev.monitor.page.div.75" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {flowOps.slice(0, replayIndex).map((op, i) => (
                    <div
                      key={op.id}
                      className="tree-node-row"
                      style={{ borderLeft: `3px solid ${op.table ? LAYER_COLORS.database : LAYER_COLORS.hook}` }}
                      onClick={() => selectOperation(op.id)}
                    >
                      <div>
                        <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>#{i + 1}</span>
                        <span style={{ fontWeight: 600 }}>{op.table ? `${op.operationType} ${op.table}` : op.queryKey || op.id.slice(0, 8)}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        +{Math.round(op.executionTime)}ms
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div id="dev.monitor.page.div.76" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد تدفقات طلب.</div>
          )}
        </section>
      )}

      {/* ─── TAB CONTENT: CALL GRAPH ─── */}
      {activeTab === 'call-graph' && (
        <section id="dev.monitor.page.section.4">
          <div id="dev.monitor.page.div.77" className="svg-card">
            <div id="dev.monitor.page.div.78" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>مخطط سلسلة الاستدعاءات (SVG)</div>
            {callGraph.nodes.length === 0 ? (
              <div id="dev.monitor.page.div.79" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                لا توجد عقد في الفلتر الحالي لرسم مخطط الاستدعاء.
              </div>
            ) : (
              <div id="dev.monitor.page.div.80" style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <svg id="dev.monitor.page.svg" width="100%" height="400" style={{ minWidth: '800px' }}>
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border)" />
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
                      <g>
                        {/* Draw connection edges */}
                        {callGraph.edges.map((edge) => {
                          const start = positions[edge.from];
                          const end = positions[edge.to];
                          if (!start || !end) return null;
                          const edgeKey = `${edge.from}->${edge.to}`;
                          return (
                            <line
                              key={edgeKey}
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
                              key={node.id}
                              transform={`translate(${pos.x - 30}, ${pos.y - 20})`}
                              onClick={() => selectOperation(node.recordId)}
                            >
                              <rect width="60" height="40" rx="6" fill={color} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                              <text x="30" y="24" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
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
        <section id="dev.monitor.page.section.5">
          <div id="dev.monitor.page.div.81" className="svg-card">
            <div id="dev.monitor.page.div.82" style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>خريطة البنية: خدمة ➔ مستودع ➔ استعلام</div>
            {dependencyGraph.nodes.length === 0 ? (
              <div id="dev.monitor.page.div.83" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                لا توجد عمليات لرسم التبعيات. نفّذ بعض الطلبات أولاً.
              </div>
            ) : (
              <div id="dev.monitor.page.div.84" style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <svg id="dev.monitor.page.svg.2" width="100%" height="400" style={{ minWidth: '800px' }}>
                  <defs>
                    <marker id="dep-arrow" viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
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
                      <g>
                        {dependencyGraph.edges.map((edge) => {
                          const start = positions[edge.from];
                          const end = positions[edge.to];
                          if (!start || !end) return null;
                          const edgeKey = `${edge.from}->${edge.to}`;
                          return (
                            <path
                              key={edgeKey}
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
                            <g key={node.id} transform={`translate(${pos.x - 75}, ${pos.y - 25})`}>
                              <rect width="150" height="50" rx="8" fill="var(--bg-card)" stroke={color} strokeWidth="2" />
                              <text x="75" y="24" textAnchor="middle" fill="var(--text-main)" fontSize="10" fontWeight="bold">
                                {node.label.slice(0, 22)}
                              </text>
                              <text x="75" y="40" textAnchor="middle" fill="var(--text-muted)" fontSize="8">
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
        <section id="dev.monitor.page.section.6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div id="dev.monitor.page.div.85" className="detail-section">
            <div id="dev.monitor.page.div.86" className="detail-section-title">أكثر الميزات نشاطاً</div>
            {stats.mostActiveFeatures.map((f, i) => (
              <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{i+1}. {f.name}</span>
                <span style={{ fontWeight: 'bold' }}>{f.count} عملية</span>
              </div>
            ))}
          </div>

          <div id="dev.monitor.page.div.87" className="detail-section">
            <div id="dev.monitor.page.div.88" className="detail-section-title">أكثر الصفحات نشاطاً</div>
            {stats.mostActivePages.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{i+1}. {p.name}</span>
                <span style={{ fontWeight: 'bold' }}>{p.count} عملية</span>
              </div>
            ))}
          </div>

          <div id="dev.monitor.page.div.89" className="detail-section">
            <div id="dev.monitor.page.div.90" className="detail-section-title">أكثر الجداول نشاطاً</div>
            {stats.mostActiveTables.map((t, i) => (
              <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{i+1}. {t.name}</span>
                <span style={{ fontWeight: 'bold' }}>{t.count} عملية</span>
              </div>
            ))}
          </div>

          <div id="dev.monitor.page.div.91" className="detail-section">
            <div id="dev.monitor.page.div.92" className="detail-section-title">أكثر المستودعات نشاطاً</div>
            {stats.mostActiveRepositories.map((r, i) => (
              <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{i+1}. {r.name}</span>
                <span style={{ fontWeight: 'bold' }}>{r.count} عملية</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── TAB CONTENT: SCHEMA SYNC ─── */}
      {activeTab === 'schema-sync' && (
        <section id="dev.monitor.page.section.7">
          <SchemaSyncPanel />
        </section>
      )}

      {/* ─── TAB CONTENT: PINNED ─── */}
      {activeTab === 'pinned' && (
        <section id="dev.monitor.page.section.8">
          <div id="dev.monitor.page.div.93" className="operations-list-card" style={{ height: 'auto', minHeight: '300px' }}>
            <div id="dev.monitor.page.div.94" className="card-header">
              <h2 id="dev.monitor.page.h2.2" style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>📌 العمليات المثبتة</h2>
            </div>
            <div id="dev.monitor.page.div.95" className="scrollable-area">
              {operations.filter((o) => o.pinned).length === 0 ? (
                <div id="dev.monitor.page.div.96" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  لا توجد عمليات مثبتة. مرّر فوق عنصر في التتبع واضغط ⭐ للتثبيت.
                </div>
              ) : (
                operations.filter((o) => o.pinned).map((op) => (
                  <div key={op.id} className="tree-node-row" onClick={() => selectOperation(op.id)}>
                    <div className="tree-node-info">
                      <div className="layer-dot" style={{ background: op.table ? LAYER_COLORS.database : LAYER_COLORS.hook }} />
                      <span style={{ fontWeight: 600 }}>{op.table ? `${op.operationType} ${op.table}` : op.queryKey || op.id}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({op.feature})</span>
                    </div>
                    <button
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
      <div id="dev.monitor.page.div.97" className={`drawer ${activeOp ? 'open' : ''}`}>
        <div id="dev.monitor.page.div.98" className="drawer-header">
          <span id="dev.monitor.page.span.30" className="drawer-title">تفاصيل العملية</span>
          <button id="dev.monitor.page.button.9" className="btn" onClick={() => selectOperation(null)}>✕ إغلاق</button>
        </div>

        {activeOp && (
          <div id="dev.monitor.page.div.99" className="drawer-body">
            <div id="dev.monitor.page.div.100" className="detail-section">
              <div id="dev.monitor.page.div.101" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span id="dev.monitor.page.span.31" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {activeOp.table ? `${activeOp.operationType} ${activeOp.table}` : activeOp.queryKey || 'استعلام'}
                </span>
                <button id="dev.monitor.page.button.10"
                  className="btn"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => togglePin(activeOp.id)}
                >
                  {activeOp.pinned ? '⭐ مثبّت' : '☆ تثبيت في الأعلى'}
                </button>
              </div>
            </div>

            <div id="dev.monitor.page.div.102" className="detail-section">
              <div id="dev.monitor.page.div.103" className="detail-section-title">معلومات التتبع</div>
              <div id="dev.monitor.page.div.104" className="info-grid">
                <span id="dev.monitor.page.span.32" className="info-label">معرّف الارتباط:</span>
                <span id="dev.monitor.page.span.33" className="info-value" style={{ fontFamily: 'monospace' }}>{activeOp.correlationId.slice(0, 16)}</span>

                <span id="dev.monitor.page.span.34" className="info-label">معرّف التدفق:</span>
                <span id="dev.monitor.page.span.35" className="info-value" style={{ fontFamily: 'monospace' }}>{activeOp.requestFlowId.slice(0, 16)}</span>

                <span id="dev.monitor.page.span.36" className="info-label">الميزة:</span>
                <span id="dev.monitor.page.span.37" className="info-value">{activeOp.feature}</span>

                <span id="dev.monitor.page.span.38" className="info-label">مسار الصفحة:</span>
                <span id="dev.monitor.page.span.39" className="info-value">{activeOp.page}</span>

                <span id="dev.monitor.page.span.40" className="info-label">الخطاف:</span>
                <span id="dev.monitor.page.span.41" className="info-value">{activeOp.hook}</span>

                <span id="dev.monitor.page.span.42" className="info-label">الخدمة:</span>
                <span id="dev.monitor.page.span.43" className="info-value">{activeOp.service}</span>

                <span id="dev.monitor.page.span.44" className="info-label">المستودع:</span>
                <span id="dev.monitor.page.span.45" className="info-value">{activeOp.repository}</span>

                <span id="dev.monitor.page.span.46" className="info-label">محرك قاعدة البيانات:</span>
                <span id="dev.monitor.page.span.47" className="info-value" style={{ color: activeOp.dbDriver === 'Turso-Production' ? '#ef4444' : '#22c55e' }}>
                  {activeOp.dbDriver}
                </span>

                <span id="dev.monitor.page.span.48" className="info-label">الحالة:</span>
                <span id="dev.monitor.page.span.49" className="info-value" style={{ color: STATUS_COLORS[activeOp.status] }}>
                  {activeOp.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div id="dev.monitor.page.div.105" className="detail-section">
              <div id="dev.monitor.page.div.106" className="detail-section-title">مقاييس الأداء</div>
              <div id="dev.monitor.page.div.107" className="info-grid">
                <span id="dev.monitor.page.span.50" className="info-label">مدة التنفيذ:</span>
                <span id="dev.monitor.page.span.51" className="info-value" style={{ color: activeOp.executionTime > SLOW_QUERY_THRESHOLD_MS ? '#ef4444' : '#22c55e', fontWeight: 800 }}>
                  {activeOp.executionTime} ms
                </span>

                <span id="dev.monitor.page.span.52" className="info-label">فرق الذاكرة:</span>
                <span id="dev.monitor.page.span.53" className="info-value">
                  {activeOp.memoryDelta != null
                    ? `${(activeOp.memoryDelta / 1024).toFixed(2)} KB`
                    : 'غير متاح (Performance.memory معطّل)'}
                </span>

                <span id="dev.monitor.page.span.54" className="info-label">صفوف مقروءة:</span>
                <span id="dev.monitor.page.span.55" className="info-value">{activeOp.rowsRead}</span>

                <span id="dev.monitor.page.span.56" className="info-label">صفوف مكتوبة:</span>
                <span id="dev.monitor.page.span.57" className="info-value">{activeOp.rowsWritten}</span>
              </div>
            </div>

            {activeOp.httpRoute && (
              <div id="dev.monitor.page.div.108" className="detail-section">
                <div id="dev.monitor.page.div.109" className="detail-section-title">طلب HTTP (AsolApiClient)</div>
                <pre className="code-block">{`${activeOp.httpMethod ?? 'GET'} ${activeOp.httpRoute}`}</pre>
              </div>
            )}

            {activeOp.sql && (
              <div id="dev.monitor.page.div.110" className="detail-section">
                <div id="dev.monitor.page.div.111" className="detail-section-title">SQL المنفّذ</div>
                <pre className="code-block">{activeOp.sql}</pre>
                {activeOp.params && activeOp.params.length > 0 && (
                  <div id="dev.monitor.page.div.112" style={{ marginTop: '8px' }}>
                    <div id="dev.monitor.page.div.113" className="detail-section-title">معاملات الاستعلام</div>
                    <pre className="code-block">{JSON.stringify(activeOp.params, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {diffResult && (
              <div id="dev.monitor.page.div.114" className="detail-section">
                <div id="dev.monitor.page.div.115" className="detail-section-title">فرق نتيجة الاستعلام (قبل ➔ بعد)</div>
                <div id="dev.monitor.page.div.116" style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', overflowX: 'auto', maxHeight: '250px' }}>
                  {diffResult.map((line, idx) => (
                    <span
                      key={idx}
                      className={`diff-line ${line.type === 'added' ? 'diff-added' : line.type === 'removed' ? 'diff-removed' : ''}`}
                    >
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ''} {line.text}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeOp.errorMessage && (
              <div id="dev.monitor.page.div.117" className="detail-section" style={{ borderColor: '#ef4444' }}>
                <div id="dev.monitor.page.div.118" className="detail-section-title" style={{ color: '#ef4444' }}>رسالة الخطأ</div>
                <div id="dev.monitor.page.div.119" style={{ color: '#f87171', fontSize: '13px', fontWeight: 600 }}>{activeOp.errorMessage}</div>
                {activeOp.executionStack && (
                  <div id="dev.monitor.page.div.120" style={{ marginTop: '8px' }}>
                    <div id="dev.monitor.page.div.121" className="detail-section-title" style={{ color: '#ef4444' }}>تتبع تنفيذ الخطأ</div>
                    <pre className="code-block" style={{ color: '#f87171', background: '#181111' }}>{activeOp.executionStack}</pre>
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

