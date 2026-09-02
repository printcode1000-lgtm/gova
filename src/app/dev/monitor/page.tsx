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
    <div id='app-dev-monitor-page-div-1-w4zfhh' className="monitor-container" dir="rtl">
      {/* Dynamic Theme Styles */}
      <style id="app-dev-monitor-page-style-2-ioh8ga" dangerouslySetInnerHTML={{ __html: `
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
      <header id='app-dev-monitor-page-header-3-5louzx' className="header no-print">
        <div id='app-dev-monitor-page-div-4-c3hojf' className="header-title">
          <h1 id='app-dev-monitor-page-heading-5-aqr4gb'>مراقب عمليات ASOL</h1>
          {isLive && <span id='app-dev-monitor-page-text-6-anm9ih' className="badge-live">مراقبة مباشرة</span>}
        </div>
        <div id='app-dev-monitor-page-div-7-tgntdl' className="header-actions">
          <button id='app-dev-monitor-page-button-8-oaq504' className="btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ الوضع الفاتح' : '🌙 الوضع الداكن'}
          </button>
          <button id='app-dev-monitor-page-button-9-7jumyv' className="btn" onClick={toggleLive}>
            {isLive ? '⏸️ إيقاف البث' : '▶️ استئناف البث'}
          </button>
          <button id='app-dev-monitor-page-button-10-c7mnrs' className="btn" onClick={clear}>
            🗑️ مسح السجلات
          </button>
          <button id='app-dev-monitor-page-button-11-1mkisj' className="btn" onClick={exportJSON}>
            📥 تصدير JSON
          </button>
          <button id='app-dev-monitor-page-button-12-lzcmvl' className="btn" onClick={exportHTML}>
            📄 تصدير HTML
          </button>
          <button id='app-dev-monitor-page-button-13-j6q7on' className="btn" onClick={exportPDF}>
            🖨️ طباعة PDF
          </button>
        </div>
      </header>

      {/* ─── TABS ─── */}
      <nav id='app-dev-monitor-page-nav-14-mulzle' className="tabs no-print">
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
      <div id='app-dev-monitor-page-div-15-fppb36' className="filters-panel no-print">
        <div id='app-dev-monitor-page-div-16-3ferg6' className="filters-grid">
          <div id='app-dev-monitor-page-div-17-gjsx2z' className="filter-group">
            <label id='app-dev-monitor-page-label-18-qnprw2'>الميزة</label>
            <select id='app-dev-monitor-page-select-19-lhdoca'
              className="filter-input"
              value={filter.feature}
              onChange={(e) => setFilter({ feature: e.target.value })}
            >
              <option id="app-dev-monitor-page-option-20-tqfsvu" value="">كل الميزات</option>
              {filterOptions.features.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div id='app-dev-monitor-page-div-21-mwunaz' className="filter-group">
            <label id='app-dev-monitor-page-label-22-rti5sh'>الصفحة</label>
            <select id='app-dev-monitor-page-select-23-aa7rtl'
              className="filter-input"
              value={filter.page}
              onChange={(e) => setFilter({ page: e.target.value })}
            >
              <option id="app-dev-monitor-page-option-24-ihnm2y" value="">كل الصفحات</option>
              {filterOptions.pages.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div id='app-dev-monitor-page-div-25-inqene' className="filter-group">
            <label id='app-dev-monitor-page-label-26-tzj5q8'>المكوّن</label>
            <select id='app-dev-monitor-page-select-27-nbwvmt'
              className="filter-input"
              value={filter.component}
              onChange={(e) => setFilter({ component: e.target.value })}
            >
              <option id="app-dev-monitor-page-option-28-bidmef" value="">كل المكوّنات</option>
              {filterOptions.components.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div id='app-dev-monitor-page-div-29-dheo37' className="filter-group">
            <label id='app-dev-monitor-page-label-30-jqkzn6'>الخطاف</label>
            <select id='app-dev-monitor-page-select-31-iukcp8'
              className="filter-input"
              value={filter.hook}
              onChange={(e) => setFilter({ hook: e.target.value })}
            >
              <option id="app-dev-monitor-page-option-32-kqhjcx" value="">كل الخطافات</option>
              {filterOptions.hooks.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div id='app-dev-monitor-page-div-33-4jqtxk' className="filter-group">
            <label id='app-dev-monitor-page-label-34-0xbi6n'>الخدمة</label>
            <select id='app-dev-monitor-page-select-35-bf0mfo'
              className="filter-input"
              value={filter.service}
              onChange={(e) => setFilter({ service: e.target.value })}
            >
              <option id="app-dev-monitor-page-option-36-2jebsb" value="">كل الخدمات</option>
              {filterOptions.services.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div id='app-dev-monitor-page-div-37-ec9i8t' className="filter-group">
            <label id='app-dev-monitor-page-label-38-cwyzta'>المستودع</label>
            <select id='app-dev-monitor-page-select-39-s4zdhc'
              className="filter-input"
              value={filter.repository}
              onChange={(e) => setFilter({ repository: e.target.value })}
            >
              <option id="app-dev-monitor-page-option-40-58k4gi" value="">كل المستودعات</option>
              {filterOptions.repositories.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div id='app-dev-monitor-page-div-41-hezpyv' className="filter-group">
            <label id='app-dev-monitor-page-label-42-oydxj7'>الجدول</label>
            <select id='app-dev-monitor-page-select-43-jrw9u4'
              className="filter-input"
              value={filter.table}
              onChange={(e) => setFilter({ table: e.target.value })}
            >
              <option id="app-dev-monitor-page-option-44-utnp66" value="">كل الجداول</option>
              {filterOptions.tables.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div id='app-dev-monitor-page-div-45-5bgcok' className="filter-group">
            <label id='app-dev-monitor-page-label-46-hxyurf'>الكيان</label>
            <select id='app-dev-monitor-page-select-47-h9ma2k'
              className="filter-input"
              value={filter.entity}
              onChange={(e) => setFilter({ entity: e.target.value })}
            >
              <option id="app-dev-monitor-page-option-48-ykmj7u" value="">كل الكيانات</option>
              {filterOptions.entities.map((ent) => <option key={ent} value={ent}>{ent}</option>)}
            </select>
          </div>

          <div id='app-dev-monitor-page-div-49-smnzap' className="filter-group">
            <label id='app-dev-monitor-page-label-50-rm61kx'>مفتاح الاستعلام</label>
            <select id='app-dev-monitor-page-select-51-ckncul'
              className="filter-input"
              value={filter.queryKey}
              onChange={(e) => setFilter({ queryKey: e.target.value })}
            >
              <option id="app-dev-monitor-page-option-52-ppotg2" value="">كل مفاتيح الاستعلام</option>
              {filterOptions.queryKeys.map((qk) => <option key={qk} value={qk}>{qk}</option>)}
            </select>
          </div>

          <div id='app-dev-monitor-page-div-53-7tmv3z' className="filter-group">
            <label id='app-dev-monitor-page-label-54-wapt8p'>نوع العملية</label>
            <select id='app-dev-monitor-page-select-55-o2y4ff'
              className="filter-input"
              value={filter.operationType}
              onChange={(e) => setFilter({ operationType: e.target.value })}
            >
              <option id="app-dev-monitor-page-option-56-cxpl5b" value="">كل الأنواع</option>
              <option id="app-dev-monitor-page-option-57-8cfxcb" value="SELECT">SELECT</option>
              <option id="app-dev-monitor-page-option-58-uwfhtu" value="INSERT">INSERT</option>
              <option id="app-dev-monitor-page-option-59-6sswa6" value="UPDATE">UPDATE</option>
              <option id="app-dev-monitor-page-option-60-zyev9w" value="DELETE">DELETE</option>
            </select>
          </div>

          <div id='app-dev-monitor-page-div-61-t0lhgw' className="filter-group">
            <label id='app-dev-monitor-page-label-62-5lbvvx'>الحالة</label>
            <select id='app-dev-monitor-page-select-63-r6uwsi'
              className="filter-input"
              value={filter.status}
              onChange={(e) => setFilter({ status: e.target.value })}
            >
              <option id="app-dev-monitor-page-option-64-yzlerv" value="">كل الحالات</option>
              <option id="app-dev-monitor-page-option-65-xf9gfc" value="success">نجاح</option>
              <option id="app-dev-monitor-page-option-66-5xbgqr" value="pending">قيد التنفيذ</option>
              <option id="app-dev-monitor-page-option-67-ny8fcz" value="error">خطأ</option>
            </select>
          </div>

          <div id='app-dev-monitor-page-div-68-kjb938' className="filter-group">
            <label id='app-dev-monitor-page-label-69-apu1rs'>محرك قاعدة البيانات</label>
            <select id='app-dev-monitor-page-select-70-43qar2'
              className="filter-input"
              value={filter.dbDriver}
              onChange={(e) => setFilter({ dbDriver: e.target.value })}
            >
              <option id="app-dev-monitor-page-option-71-t5qnxz" value="">كل المحركات</option>
              <option id="app-dev-monitor-page-option-72-iumqzt" value="SQLite-Dev">SQLite للتطوير</option>
              <option id="app-dev-monitor-page-option-73-8hi1nq" value="Turso-Production">Turso للإنتاج</option>
            </select>
          </div>

          <div id='app-dev-monitor-page-div-74-5v6p2y' className="filter-group">
            <label id='app-dev-monitor-page-label-75-h7udzp'>مصدر الذاكرة المؤقتة</label>
            <select id='app-dev-monitor-page-select-76-2bjsun'
              className="filter-input"
              value={filter.cacheSource}
              onChange={(e) => setFilter({ cacheSource: e.target.value })}
            >
              <option id="app-dev-monitor-page-option-77-quav0b" value="">كل مصادر الذاكرة المؤقتة</option>
              <option id="app-dev-monitor-page-option-78-mot2oa" value="Memory">ذاكرة مؤقتة RAM</option>
              <option id="app-dev-monitor-page-option-79-muyvcr" value="IndexedDB">IndexedDB</option>
              <option id="app-dev-monitor-page-option-80-lvsp1v" value="HTTP">HTTP (AsolApiClient)</option>
              <option id="app-dev-monitor-page-option-81-jgtdjq" value="Database">مصدر قاعدة البيانات</option>
            </select>
          </div>
        </div>

        <div id='app-dev-monitor-page-div-82-hkkszj' className="search-bar">
          <input id='app-dev-monitor-page-input-83-d2afy0'
            className="filter-input search-input"
            placeholder="ابحث في الميزات أو SQL أو الخطافات أو مفاتيح الاستعلام أو رسائل الخطأ..."
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
          />
          <button id='app-dev-monitor-page-button-84-e6e7ar' className="btn" onClick={resetFilter}>إعادة ضبط الفلاتر</button>
        </div>
      </div>

      {/* ─── TAB CONTENT: DASHBOARD ─── */}
      {activeTab === 'dashboard' && (
        <section id='app-dev-monitor-page-section-85-jvnex6'>
          <div id='app-dev-monitor-page-div-86-5zbe3z' className="stats-grid">
            <div id='app-dev-monitor-page-div-87-qpmilh' className="stat-card">
              <span id='app-dev-monitor-page-text-88-rdquts' className="stat-title">إجمالي العمليات</span>
              <span id='app-dev-monitor-page-text-89-az0bh9' className="stat-value">{filteredOps.length}</span>
              <div id='app-dev-monitor-page-div-90-gvno5p' className="card-accent" style={{ '--accent': '#3b82f6' } as any} />
            </div>
            <div id='app-dev-monitor-page-div-91-musswt' className="stat-card">
              <span id='app-dev-monitor-page-text-92-jpfg1x' className="stat-title">قراءات (SELECT)</span>
              <span id='app-dev-monitor-page-text-93-25hqk2' className="stat-value">{stats.totalReads}</span>
              <div id='app-dev-monitor-page-div-94-blaypx' className="card-accent" style={{ '--accent': '#22c55e' } as any} />
            </div>
            <div id='app-dev-monitor-page-div-95-f9eha5' className="stat-card">
              <span id='app-dev-monitor-page-text-96-tbd3pn' className="stat-title">كتابات (MUTATIONS)</span>
              <span id='app-dev-monitor-page-text-97-jq3zlm' className="stat-value">{stats.totalWrites}</span>
              <div id='app-dev-monitor-page-div-98-vorqbq' className="card-accent" style={{ '--accent': '#ef4444' } as any} />
            </div>
            <div id='app-dev-monitor-page-div-99-zuwktv' className="stat-card">
              <span id='app-dev-monitor-page-text-100-tr5xq8' className="stat-title">إجمالي استدعاءات قاعدة البيانات</span>
              <span id='app-dev-monitor-page-text-101-rr6hi9' className="stat-value">{stats.totalDbCalls}</span>
              <div id='app-dev-monitor-page-div-102-v9r39w' className="card-accent" style={{ '--accent': '#a855f7' } as any} />
            </div>
            <div id='app-dev-monitor-page-div-103-zlelmx' className="stat-card">
              <span id='app-dev-monitor-page-text-104-k0o8lf' className="stat-title">إصابات الذاكرة المؤقتة</span>
              <span id='app-dev-monitor-page-text-105-3l6dil' className="stat-value">{stats.totalCacheHits}</span>
              <div id='app-dev-monitor-page-div-106-xittot' className="card-accent" style={{ '--accent': '#eab308' } as any} />
            </div>
            <div id='app-dev-monitor-page-div-107-x1tthf' className="stat-card">
              <span id='app-dev-monitor-page-text-108-f1sjgd' className="stat-title">إخفاقات الذاكرة المؤقتة</span>
              <span id='app-dev-monitor-page-text-109-mgco4c' className="stat-value">{stats.totalCacheMisses}</span>
              <div id='app-dev-monitor-page-div-110-4zuqyb' className="card-accent" style={{ '--accent': '#a855f7' } as any} />
            </div>
            <div id='app-dev-monitor-page-div-111-0plhvn' className="stat-card">
              <span id='app-dev-monitor-page-text-112-v1ccco' className="stat-title">نسبة إصابة الذاكرة المؤقتة</span>
              <span id='app-dev-monitor-page-text-113-lmymzj' className="stat-value">{stats.cacheHitRate}%</span>
              <div id='app-dev-monitor-page-div-114-7lqi9u' className="card-accent" style={{ '--accent': '#eab308' } as any} />
            </div>
            <div id='app-dev-monitor-page-div-115-mzwcmg' className="stat-card">
              <span id='app-dev-monitor-page-text-116-gjwghe' className="stat-title">استعلامات نشطة</span>
              <span id='app-dev-monitor-page-text-117-wbgfrb' className="stat-value">{stats.activeQueries}</span>
              <div id='app-dev-monitor-page-div-118-saw1qr' className="card-accent" style={{ '--accent': '#06b6d4' } as any} />
            </div>
            <div id='app-dev-monitor-page-div-119-o9np26' className="stat-card">
              <span id='app-dev-monitor-page-text-120-bhuwji' className="stat-title">تعديلات نشطة</span>
              <span id='app-dev-monitor-page-text-121-a4f1zy' className="stat-value">{stats.activeMutations}</span>
              <div id='app-dev-monitor-page-div-122-73vovw' className="card-accent" style={{ '--accent': '#f97316' } as any} />
            </div>
            <div id='app-dev-monitor-page-div-123-yyx3us' className="stat-card">
              <span id='app-dev-monitor-page-text-124-uga0tg' className="stat-title">قراءات دون اتصال</span>
              <span id='app-dev-monitor-page-text-125-xb6rq5' className="stat-value">{stats.offlineReads}</span>
              <div id='app-dev-monitor-page-div-126-reinpp' className="card-accent" style={{ '--accent': '#64748b' } as any} />
            </div>
            <div id='app-dev-monitor-page-div-127-3sxtki' className="stat-card">
              <span id='app-dev-monitor-page-text-128-vowmuz' className="stat-title">قراءات متصلة</span>
              <span id='app-dev-monitor-page-text-129-9qba5g' className="stat-value">{stats.onlineReads}</span>
              <div id='app-dev-monitor-page-div-130-a1jexj' className="card-accent" style={{ '--accent': '#3b82f6' } as any} />
            </div>
            <div id='app-dev-monitor-page-div-131-bqr9nr' className="stat-card">
              <span id='app-dev-monitor-page-text-132-jhuymm' className="stat-title">متوسط زمن قاعدة البيانات</span>
              <span id='app-dev-monitor-page-text-133-wvdxuu' className="stat-value">{stats.avgExecutionTime} ms</span>
              <div id='app-dev-monitor-page-div-134-kdzshs' className="card-accent" style={{ '--accent': '#ef4444' } as any} />
            </div>
            <div id='app-dev-monitor-page-div-135-xe289w' className="stat-card alert">
              <span id='app-dev-monitor-page-text-136-s0osve' className="stat-title">تنبيهات N+1</span>
              <span id='app-dev-monitor-page-text-137-kdvjor' className="stat-value" style={{ color: '#f97316' }}>{stats.n1Alerts}</span>
              <div id='app-dev-monitor-page-div-138-fkc5r9' className="card-accent" style={{ '--accent': '#f97316' } as any} />
            </div>
            <div id='app-dev-monitor-page-div-139-wja0c5' className="stat-card error">
              <span id='app-dev-monitor-page-text-140-uqekcn' className="stat-title">استعلامات مكررة</span>
              <span id='app-dev-monitor-page-text-141-0qsbn2' className="stat-value" style={{ color: '#ef4444' }}>{stats.duplicateAlerts}</span>
              <div id='app-dev-monitor-page-div-142-g04bpr' className="card-accent" style={{ '--accent': '#ef4444' } as any} />
            </div>
          </div>

          <div id='app-dev-monitor-page-div-143-krjb1j' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div id='app-dev-monitor-page-div-144-h7kbb1' className="detail-section">
              <div id='app-dev-monitor-page-div-145-bnt407' className="detail-section-title">أبطأ عمليات قاعدة البيانات</div>
              {stats.slowestOps.length === 0 ? (
                <div id='app-dev-monitor-page-div-146-s8gfec' style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px' }}>لا توجد استعلامات مسجّلة.</div>
              ) : (
                <table id='app-dev-monitor-page-table-147-2fulil' style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead id='app-dev-monitor-page-thead-148-aj7mmf'>
                    <tr id='app-dev-monitor-page-tr-149-dueknz' style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th id='app-dev-monitor-page-th-150-pkwun0' style={{ padding: '6px' }}>الجدول</th>
                      <th id='app-dev-monitor-page-th-151-n9lrct' style={{ padding: '6px' }}>العملية</th>
                      <th id='app-dev-monitor-page-th-152-9hommf' style={{ padding: '6px', textAlign: 'right' }}>المدة (ms)</th>
                    </tr>
                  </thead>
                  <tbody id='app-dev-monitor-page-tbody-153-ynch2o'>
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

            <div id='app-dev-monitor-page-div-154-ehjr69' className="detail-section">
              <div id='app-dev-monitor-page-div-155-tcih7e' className="detail-section-title">تحذيرات N+1 / التكرار</div>
              <div id='app-dev-monitor-page-div-156-zjap7u' style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredOps.filter(o => o.isDuplicate || o.isN1).length === 0 ? (
                  <div id='app-dev-monitor-page-div-157-sizjve' style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px' }}>لا توجد مشاكل N+1 أو تكرار.</div>
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
        <section id='app-dev-monitor-page-section-158-1v9y8t' className="ops-panel">
          <div id='app-dev-monitor-page-div-159-e1k23m' className="operations-list-card">
            <div id='app-dev-monitor-page-div-160-vgxtof' className="card-header">
              <h2 id='app-dev-monitor-page-heading-161-onacpj' style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>تتبع العمليات (شجرة التدفق)</h2>
              <div id='app-dev-monitor-page-div-162-zrl3gs' style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label id='app-dev-monitor-page-label-163-r2sgfm' style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input id='app-dev-monitor-page-input-164-xppreh'
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                  />
                  📌 تمرير تلقائي
                </label>
                {!autoScroll && (
                  <button id='app-dev-monitor-page-button-165-r2rp07' className="btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setAutoScroll(true)}>
                    إعادة تفعيل التمرير التلقائي
                  </button>
                )}
              </div>
            </div>

            <div id='app-dev-monitor-page-div-166-ll2ig5' className="scrollable-area" ref={listContainerRef} onScroll={handleScroll}>
              {treeData.length === 0 ? (
                <div id='app-dev-monitor-page-div-167-gzeag6' style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
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

          <div id='app-dev-monitor-page-div-168-t7thh5' style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div id='app-dev-monitor-page-div-169-vooh80' className="detail-section">
              <div id='app-dev-monitor-page-div-170-io8o2x' className="detail-section-title">كيفية تفعيل التتبع</div>
              <div id='app-dev-monitor-page-div-171-u3plar' style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <ol id='app-dev-monitor-page-ol-172-a0zsgy' style={{ paddingLeft: '16px', margin: '4px 0' }}>
                  <li id='app-dev-monitor-page-li-173-vclhkk'>انتقل إلى صفحات المصادقة (تسجيل الدخول أو التسجيل).</li>
                  <li id='app-dev-monitor-page-li-174-aebus9'>اضغط الأزرار أو املأ النماذج لتفعيل استدعاءات قاعدة البيانات والذاكرة المؤقتة.</li>
                  <li id='app-dev-monitor-page-li-175-vthhis'>ستظهر العمليات هنا مباشرة في الوقت الفعلي.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── TAB CONTENT: TIMELINE / FLAME CHART ─── */}
      {activeTab === 'timeline' && (
        <section id='app-dev-monitor-page-section-176-bd9ifr'>
          <div id='app-dev-monitor-page-div-177-ksjh37' className="detail-section" style={{ marginBottom: '16px' }}>
            <label id='app-dev-monitor-page-label-178-skhipt' style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>اختر تدفق الطلب لعرض الخط الزمني:</label>
            <select id='app-dev-monitor-page-select-179-rn72y5'
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
            <div id='app-dev-monitor-page-div-180-mfflnr'>
              <div id='app-dev-monitor-page-div-181-w3c1li' className="flame-chart-container">
                <div id='app-dev-monitor-page-div-182-cdwymy' style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  Flame Chart (مخطط جانت للطبقات)
                </div>
                <div id='app-dev-monitor-page-div-183-s1gjbn' className="flame-chart">
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
              <div id='app-dev-monitor-page-div-184-qrut7v' className="detail-section">
                <div id='app-dev-monitor-page-div-185-l8rlvm' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div id='app-dev-monitor-page-div-186-pzgid8' style={{ fontSize: '14px', fontWeight: 700 }}>إعادة تشغيل الخط الزمني</div>
                  <div id='app-dev-monitor-page-div-187-kjmuwy' style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    الخطوة {replayIndex} من {flowOps.length}
                  </div>
                </div>

                <input id='app-dev-monitor-page-input-188-zygfnt'
                  type="range"
                  min="0"
                  max={flowOps.length}
                  value={replayIndex}
                  onChange={(e) => setReplayIndex(Number(e.target.value))}
                  style={{ width: '100%', marginBottom: '16px' }}
                />

                <div id='app-dev-monitor-page-div-189-38icza' style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            <div id='app-dev-monitor-page-div-190-p70p1n' style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد تدفقات طلب.</div>
          )}
        </section>
      )}

      {/* ─── TAB CONTENT: CALL GRAPH ─── */}
      {activeTab === 'call-graph' && (
        <section id='app-dev-monitor-page-section-191-beidcm'>
          <div id='app-dev-monitor-page-div-192-ivhd2i' className="svg-card">
            <div id='app-dev-monitor-page-div-193-ubphkk' style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>مخطط سلسلة الاستدعاءات (SVG)</div>
            {callGraph.nodes.length === 0 ? (
              <div id='app-dev-monitor-page-div-194-tjkuvc' style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                لا توجد عقد في الفلتر الحالي لرسم مخطط الاستدعاء.
              </div>
            ) : (
              <div id='app-dev-monitor-page-div-195-6vsoes' style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <svg id='app-dev-monitor-page-svg-196-b6esen' width="100%" height="400" style={{ minWidth: '800px' }}>
                  <defs id="app-dev-monitor-page-defs-197-ol6hip">
                    <marker id='app-dev-monitor-page-marker-198-6xsj1y' viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path id="app-dev-monitor-page-path-199-nd6hqt" d="M 0 0 L 10 5 L 0 10 z" fill="var(--border)" />
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
                      <g id="app-dev-monitor-page-g-200-spyhvs">
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
        <section id='app-dev-monitor-page-section-201-8ztqwu'>
          <div id='app-dev-monitor-page-div-202-ultlox' className="svg-card">
            <div id='app-dev-monitor-page-div-203-9outek' style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>خريطة البنية: خدمة ➔ مستودع ➔ استعلام</div>
            {dependencyGraph.nodes.length === 0 ? (
              <div id='app-dev-monitor-page-div-204-dgame6' style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                لا توجد عمليات لرسم التبعيات. نفّذ بعض الطلبات أولاً.
              </div>
            ) : (
              <div id='app-dev-monitor-page-div-205-a7yfr2' style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <svg id='app-dev-monitor-page-svg-206-uz6hcu' width="100%" height="400" style={{ minWidth: '800px' }}>
                  <defs id="app-dev-monitor-page-defs-207-boa8n9">
                    <marker id='app-dev-monitor-page-marker-208-4ttchn' viewBox="0 0 10 10" refX="25" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path id="app-dev-monitor-page-path-209-2vbwou" d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
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
                      <g id="app-dev-monitor-page-g-210-v87xz6">
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
        <section id='app-dev-monitor-page-section-211-rjgna7' style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div id='app-dev-monitor-page-div-212-l2puhn' className="detail-section">
            <div id='app-dev-monitor-page-div-213-ttlcii' className="detail-section-title">أكثر الميزات نشاطاً</div>
            {stats.mostActiveFeatures.map((f, i) => (
              <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{i+1}. {f.name}</span>
                <span style={{ fontWeight: 'bold' }}>{f.count} عملية</span>
              </div>
            ))}
          </div>

          <div id='app-dev-monitor-page-div-214-pwvpha' className="detail-section">
            <div id='app-dev-monitor-page-div-215-j013vj' className="detail-section-title">أكثر الصفحات نشاطاً</div>
            {stats.mostActivePages.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{i+1}. {p.name}</span>
                <span style={{ fontWeight: 'bold' }}>{p.count} عملية</span>
              </div>
            ))}
          </div>

          <div id='app-dev-monitor-page-div-216-scbic7' className="detail-section">
            <div id='app-dev-monitor-page-div-217-gbx7f8' className="detail-section-title">أكثر الجداول نشاطاً</div>
            {stats.mostActiveTables.map((t, i) => (
              <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{i+1}. {t.name}</span>
                <span style={{ fontWeight: 'bold' }}>{t.count} عملية</span>
              </div>
            ))}
          </div>

          <div id='app-dev-monitor-page-div-218-wiyhtf' className="detail-section">
            <div id='app-dev-monitor-page-div-219-u05djw' className="detail-section-title">أكثر المستودعات نشاطاً</div>
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
        <section id='app-dev-monitor-page-section-220-zzi18n'>
          <SchemaSyncPanel />
        </section>
      )}

      {/* ─── TAB CONTENT: PINNED ─── */}
      {activeTab === 'pinned' && (
        <section id='app-dev-monitor-page-section-221-hhsrcf'>
          <div id='app-dev-monitor-page-div-222-fqcmvw' className="operations-list-card" style={{ height: 'auto', minHeight: '300px' }}>
            <div id='app-dev-monitor-page-div-223-ecp12d' className="card-header">
              <h2 id='app-dev-monitor-page-heading-224-ewgwps' style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>📌 العمليات المثبتة</h2>
            </div>
            <div id='app-dev-monitor-page-div-225-adgajn' className="scrollable-area">
              {operations.filter((o) => o.pinned).length === 0 ? (
                <div id='app-dev-monitor-page-div-226-0zsb9v' style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
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
      <div id='app-dev-monitor-page-div-227-r8yow4' className={`drawer ${activeOp ? 'open' : ''}`}>
        <div id='app-dev-monitor-page-div-228-mcn793' className="drawer-header">
          <span id='app-dev-monitor-page-text-229-gg17b4' className="drawer-title">تفاصيل العملية</span>
          <button id='app-dev-monitor-page-button-230-myzvlj' className="btn" onClick={() => selectOperation(null)}>✕ إغلاق</button>
        </div>

        {activeOp && (
          <div id='app-dev-monitor-page-div-231-or3duz' className="drawer-body">
            <div id='app-dev-monitor-page-div-232-k4ci1b' className="detail-section">
              <div id='app-dev-monitor-page-div-233-bfddbz' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span id='app-dev-monitor-page-text-234-gogrsz' style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {activeOp.table ? `${activeOp.operationType} ${activeOp.table}` : activeOp.queryKey || 'استعلام'}
                </span>
                <button id='app-dev-monitor-page-button-235-2ddf4r'
                  className="btn"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => togglePin(activeOp.id)}
                >
                  {activeOp.pinned ? '⭐ مثبّت' : '☆ تثبيت في الأعلى'}
                </button>
              </div>
            </div>

            <div id='app-dev-monitor-page-div-236-mouz6x' className="detail-section">
              <div id='app-dev-monitor-page-div-237-ahwdjt' className="detail-section-title">معلومات التتبع</div>
              <div id='app-dev-monitor-page-div-238-r3ksol' className="info-grid">
                <span id='app-dev-monitor-page-text-239-84of3m' className="info-label">معرّف الارتباط:</span>
                <span id='app-dev-monitor-page-text-240-ke5vrs' className="info-value" style={{ fontFamily: 'monospace' }}>{activeOp.correlationId.slice(0, 16)}</span>

                <span id='app-dev-monitor-page-text-241-ba2vfo' className="info-label">معرّف التدفق:</span>
                <span id='app-dev-monitor-page-text-242-odseft' className="info-value" style={{ fontFamily: 'monospace' }}>{activeOp.requestFlowId.slice(0, 16)}</span>

                <span id='app-dev-monitor-page-text-243-rxjhol' className="info-label">الميزة:</span>
                <span id='app-dev-monitor-page-text-244-89gi6m' className="info-value">{activeOp.feature}</span>

                <span id='app-dev-monitor-page-text-245-hxhzjm' className="info-label">مسار الصفحة:</span>
                <span id='app-dev-monitor-page-text-246-1v9dah' className="info-value">{activeOp.page}</span>

                <span id='app-dev-monitor-page-text-247-v6atws' className="info-label">الخطاف:</span>
                <span id='app-dev-monitor-page-text-248-d0mv1e' className="info-value">{activeOp.hook}</span>

                <span id='app-dev-monitor-page-text-249-ocu7c1' className="info-label">الخدمة:</span>
                <span id='app-dev-monitor-page-text-250-5sifvb' className="info-value">{activeOp.service}</span>

                <span id='app-dev-monitor-page-text-251-ufghw5' className="info-label">المستودع:</span>
                <span id='app-dev-monitor-page-text-252-tpfrvm' className="info-value">{activeOp.repository}</span>

                <span id='app-dev-monitor-page-text-253-pv3kdy' className="info-label">محرك قاعدة البيانات:</span>
                <span id='app-dev-monitor-page-text-254-zulvet' className="info-value" style={{ color: activeOp.dbDriver === 'Turso-Production' ? '#ef4444' : '#22c55e' }}>
                  {activeOp.dbDriver}
                </span>

                <span id='app-dev-monitor-page-text-255-yaww8j' className="info-label">الحالة:</span>
                <span id='app-dev-monitor-page-text-256-egho1y' className="info-value" style={{ color: STATUS_COLORS[activeOp.status] }}>
                  {activeOp.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div id='app-dev-monitor-page-div-257-3ljtw2' className="detail-section">
              <div id='app-dev-monitor-page-div-258-nvw6e1' className="detail-section-title">مقاييس الأداء</div>
              <div id='app-dev-monitor-page-div-259-aci1ko' className="info-grid">
                <span id='app-dev-monitor-page-text-260-qv72va' className="info-label">مدة التنفيذ:</span>
                <span id='app-dev-monitor-page-text-261-gcsdsx' className="info-value" style={{ color: activeOp.executionTime > SLOW_QUERY_THRESHOLD_MS ? '#ef4444' : '#22c55e', fontWeight: 800 }}>
                  {activeOp.executionTime} ms
                </span>

                <span id='app-dev-monitor-page-text-262-kgrtsp' className="info-label">فرق الذاكرة:</span>
                <span id='app-dev-monitor-page-text-263-5cua8n' className="info-value">
                  {activeOp.memoryDelta != null
                    ? `${(activeOp.memoryDelta / 1024).toFixed(2)} KB`
                    : 'غير متاح (Performance.memory معطّل)'}
                </span>

                <span id='app-dev-monitor-page-text-264-w3zkvy' className="info-label">صفوف مقروءة:</span>
                <span id='app-dev-monitor-page-text-265-zu21ru' className="info-value">{activeOp.rowsRead}</span>

                <span id='app-dev-monitor-page-text-266-hu77tu' className="info-label">صفوف مكتوبة:</span>
                <span id='app-dev-monitor-page-text-267-j327vo' className="info-value">{activeOp.rowsWritten}</span>
              </div>
            </div>

            {activeOp.httpRoute && (
              <div id='app-dev-monitor-page-div-268-19aefv' className="detail-section">
                <div id='app-dev-monitor-page-div-269-kdlunz' className="detail-section-title">طلب HTTP (AsolApiClient)</div>
                <pre id="app-dev-monitor-page-pre-270-ec7cmg" className="code-block">{`${activeOp.httpMethod ?? 'GET'} ${activeOp.httpRoute}`}</pre>
              </div>
            )}

            {activeOp.sql && (
              <div id='app-dev-monitor-page-div-271-6qp1lc' className="detail-section">
                <div id='app-dev-monitor-page-div-272-jazlcb' className="detail-section-title">SQL المنفّذ</div>
                <pre id="app-dev-monitor-page-pre-273-nhifqn" className="code-block">{activeOp.sql}</pre>
                {activeOp.params && activeOp.params.length > 0 && (
                  <div id='app-dev-monitor-page-div-274-ok6bxl' style={{ marginTop: '8px' }}>
                    <div id='app-dev-monitor-page-div-275-6rt7sg' className="detail-section-title">معاملات الاستعلام</div>
                    <pre id="app-dev-monitor-page-pre-276-xqmcbs" className="code-block">{JSON.stringify(activeOp.params, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {diffResult && (
              <div id='app-dev-monitor-page-div-277-ppxv0u' className="detail-section">
                <div id='app-dev-monitor-page-div-278-dxkffs' className="detail-section-title">فرق نتيجة الاستعلام (قبل ➔ بعد)</div>
                <div id='app-dev-monitor-page-div-279-yijawi' style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', overflowX: 'auto', maxHeight: '250px' }}>
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
              <div id='app-dev-monitor-page-div-280-kkqy9o' className="detail-section" style={{ borderColor: '#ef4444' }}>
                <div id='app-dev-monitor-page-div-281-swh2l2' className="detail-section-title" style={{ color: '#ef4444' }}>رسالة الخطأ</div>
                <div id='app-dev-monitor-page-div-282-xl99c8' style={{ color: '#f87171', fontSize: '13px', fontWeight: 600 }}>{activeOp.errorMessage}</div>
                {activeOp.executionStack && (
                  <div id='app-dev-monitor-page-div-283-zt3rjv' style={{ marginTop: '8px' }}>
                    <div id='app-dev-monitor-page-div-284-vk1jmy' className="detail-section-title" style={{ color: '#ef4444' }}>تتبع تنفيذ الخطأ</div>
                    <pre id="app-dev-monitor-page-pre-285-q6k1dn" className="code-block" style={{ color: '#f87171', background: '#181111' }}>{activeOp.executionStack}</pre>
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

