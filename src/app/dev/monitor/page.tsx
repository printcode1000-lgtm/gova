'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { useMonitorStore, startNewFlow, type TreeNode } from '@/core/monitor/monitor-store';
import { LAYER_COLORS, OP_TYPE_COLORS, STATUS_COLORS, SLOW_QUERY_THRESHOLD_MS } from '@/core/monitor/types';
import type { OperationRecord, LayerName } from '@/core/monitor/types';

// Guard production environment
if (process.env.NODE_ENV !== 'development') {
  notFound();
}

// ─── Simple unified line-by-line diff function for JSON ───────────────────────
function diffLines(prevStr: string, currStr: string) {
  const prevLines = prevStr.split('\n');
  const currLines = currStr.split('\n');
  const result: { type: 'added' | 'removed' | 'normal'; text: string }[] = [];
  let p = 0;
  let c = 0;

  while (p < prevLines.length || c < currLines.length) {
    if (p < prevLines.length && c < currLines.length) {
      if (prevLines[p] === currLines[c]) {
        result.push({ type: 'normal', text: prevLines[p] });
        p++;
        c++;
      } else {
        const nextC = currLines.indexOf(prevLines[p], c);
        if (nextC !== -1 && nextC - c < 5) {
          for (let i = c; i < nextC; i++) {
            result.push({ type: 'added', text: currLines[i] });
          }
          c = nextC;
        } else {
          result.push({ type: 'removed', text: prevLines[p] });
          p++;
        }
      }
    } else if (p < prevLines.length) {
      result.push({ type: 'removed', text: prevLines[p] });
      p++;
    } else {
      result.push({ type: 'added', text: currLines[c] });
      c++;
    }
  }
  return result;
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
  } = useMonitorStore();

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
    return diffLines(prev, curr);
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
    <div className="monitor-container">
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
          --bg-hover: #222b48;
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
          --bg-hover: #e2e8f0;
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
          cursor: pointer;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-main);
          transition: all 0.2s ease;
        }
        .btn:hover {
          background: var(--bg-hover);
          transform: translateY(-1px);
        }
        .btn-primary {
          background: #3b82f6;
          color: white;
          border: none;
        }
        .btn-primary:hover {
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
          cursor: pointer;
          border: none;
          background: transparent;
          color: var(--text-muted);
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .tab-btn.active {
          background: var(--bg-hover);
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
        .stat-card:hover {
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
          cursor: pointer;
          margin-bottom: 2px;
          font-size: 13px;
          transition: background-color 0.15s ease;
        }
        .tree-node-row:hover {
          background: var(--bg-hover);
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
          cursor: pointer;
          padding: 0 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: transform 0.15s ease;
        }
        .flame-bar:hover {
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
      <header className="header no-print">
        <div className="header-title">
          <h1>GoVa Operation Monitor</h1>
          {isLive && <span className="badge-live">LIVE MONITORING</span>}
        </div>
        <div className="header-actions">
          <button className="btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button className="btn" onClick={toggleLive}>
            {isLive ? '⏸️ Pause Stream' : '▶️ Resume Stream'}
          </button>
          <button className="btn" onClick={clear}>
            🗑️ Clear logs
          </button>
          <button className="btn" onClick={exportJSON}>
            📥 Export JSON
          </button>
          <button className="btn" onClick={exportHTML}>
            📄 Export HTML
          </button>
          <button className="btn" onClick={exportPDF}>
            🖨️ Print PDF
          </button>
        </div>
      </header>

      {/* ─── TABS ─── */}
      <nav className="tabs no-print">
        {['dashboard', 'operations', 'timeline', 'call-graph', 'dependency', 'analytics', 'pinned'].map((t) => (
          <button
            key={t}
            className={`tab-btn ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </nav>

      {/* ─── FILTERS ─── */}
      <div className="filters-panel no-print">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Feature</label>
            <select
              className="filter-input"
              value={filter.feature}
              onChange={(e) => setFilter({ feature: e.target.value })}
            >
              <option value="">All Features</option>
              {filterOptions.features.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Page</label>
            <select
              className="filter-input"
              value={filter.page}
              onChange={(e) => setFilter({ page: e.target.value })}
            >
              <option value="">All Pages</option>
              {filterOptions.pages.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Component</label>
            <select
              className="filter-input"
              value={filter.component}
              onChange={(e) => setFilter({ component: e.target.value })}
            >
              <option value="">All Components</option>
              {filterOptions.components.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Hook</label>
            <select
              className="filter-input"
              value={filter.hook}
              onChange={(e) => setFilter({ hook: e.target.value })}
            >
              <option value="">All Hooks</option>
              {filterOptions.hooks.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Service</label>
            <select
              className="filter-input"
              value={filter.service}
              onChange={(e) => setFilter({ service: e.target.value })}
            >
              <option value="">All Services</option>
              {filterOptions.services.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Repository</label>
            <select
              className="filter-input"
              value={filter.repository}
              onChange={(e) => setFilter({ repository: e.target.value })}
            >
              <option value="">All Repositories</option>
              {filterOptions.repositories.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Table</label>
            <select
              className="filter-input"
              value={filter.table}
              onChange={(e) => setFilter({ table: e.target.value })}
            >
              <option value="">All Tables</option>
              {filterOptions.tables.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Entity</label>
            <select
              className="filter-input"
              value={filter.entity}
              onChange={(e) => setFilter({ entity: e.target.value })}
            >
              <option value="">All Entities</option>
              {filterOptions.entities.map((ent) => <option key={ent} value={ent}>{ent}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Query Key</label>
            <select
              className="filter-input"
              value={filter.queryKey}
              onChange={(e) => setFilter({ queryKey: e.target.value })}
            >
              <option value="">All Query Keys</option>
              {filterOptions.queryKeys.map((qk) => <option key={qk} value={qk}>{qk}</option>)}
            </select>
          </div>

          <div className="filter-group">
            <label>Op Type</label>
            <select
              className="filter-input"
              value={filter.operationType}
              onChange={(e) => setFilter({ operationType: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="SELECT">SELECT</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              className="filter-input"
              value={filter.status}
              onChange={(e) => setFilter({ status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div className="filter-group">
            <label>DB Driver</label>
            <select
              className="filter-input"
              value={filter.dbDriver}
              onChange={(e) => setFilter({ dbDriver: e.target.value })}
            >
              <option value="">All Drivers</option>
              <option value="SQLite-Dev">SQLite Dev</option>
              <option value="Turso-Production">Turso Production</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Cache Source</label>
            <select
              className="filter-input"
              value={filter.cacheSource}
              onChange={(e) => setFilter({ cacheSource: e.target.value })}
            >
              <option value="">All Cache Sources</option>
              <option value="Memory">Memory Cache</option>
              <option value="IndexedDB">IndexedDB</option>
              <option value="Database">Database Source</option>
            </select>
          </div>
        </div>

        <div className="search-bar">
          <input
            className="filter-input search-input"
            placeholder="Type features, SQL, hooks, query keys, error messages to search..."
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
          />
          <button className="btn" onClick={resetFilter}>Reset Filters</button>
        </div>
      </div>

      {/* ─── TAB CONTENT: DASHBOARD ─── */}
      {activeTab === 'dashboard' && (
        <section>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-title">Total Operations</span>
              <span className="stat-value">{filteredOps.length}</span>
              <div className="card-accent" style={{ '--accent': '#3b82f6' } as any} />
            </div>
            <div className="stat-card">
              <span className="stat-title">Reads (SELECT)</span>
              <span className="stat-value">{stats.totalReads}</span>
              <div className="card-accent" style={{ '--accent': '#22c55e' } as any} />
            </div>
            <div className="stat-card">
              <span className="stat-title">Writes (MUTATIONS)</span>
              <span className="stat-value">{stats.totalWrites}</span>
              <div className="card-accent" style={{ '--accent': '#ef4444' } as any} />
            </div>
            <div className="stat-card">
              <span className="stat-title">Total DB Calls</span>
              <span className="stat-value">{stats.totalDbCalls}</span>
              <div className="card-accent" style={{ '--accent': '#a855f7' } as any} />
            </div>
            <div className="stat-card">
              <span className="stat-title">Cache Hits</span>
              <span className="stat-value">{stats.totalCacheHits}</span>
              <div className="card-accent" style={{ '--accent': '#eab308' } as any} />
            </div>
            <div className="stat-card">
              <span className="stat-title">Cache Misses</span>
              <span className="stat-value">{stats.totalCacheMisses}</span>
              <div className="card-accent" style={{ '--accent': '#a855f7' } as any} />
            </div>
            <div className="stat-card">
              <span className="stat-title">Cache Hit Rate</span>
              <span className="stat-value">{stats.cacheHitRate}%</span>
              <div className="card-accent" style={{ '--accent': '#eab308' } as any} />
            </div>
            <div className="stat-card">
              <span className="stat-title">Active Queries</span>
              <span className="stat-value">{stats.activeQueries}</span>
              <div className="card-accent" style={{ '--accent': '#06b6d4' } as any} />
            </div>
            <div className="stat-card">
              <span className="stat-title">Active Mutations</span>
              <span className="stat-value">{stats.activeMutations}</span>
              <div className="card-accent" style={{ '--accent': '#f97316' } as any} />
            </div>
            <div className="stat-card">
              <span className="stat-title">Offline Reads</span>
              <span className="stat-value">{stats.offlineReads}</span>
              <div className="card-accent" style={{ '--accent': '#64748b' } as any} />
            </div>
            <div className="stat-card">
              <span className="stat-title">Online Reads</span>
              <span className="stat-value">{stats.onlineReads}</span>
              <div className="card-accent" style={{ '--accent': '#3b82f6' } as any} />
            </div>
            <div className="stat-card">
              <span className="stat-title">Avg DB Time</span>
              <span className="stat-value">{stats.avgExecutionTime} ms</span>
              <div className="card-accent" style={{ '--accent': '#ef4444' } as any} />
            </div>
            <div className="stat-card alert">
              <span className="stat-title">N+1 Query Alerts</span>
              <span className="stat-value" style={{ color: '#f97316' }}>{stats.n1Alerts}</span>
              <div className="card-accent" style={{ '--accent': '#f97316' } as any} />
            </div>
            <div className="stat-card error">
              <span className="stat-title">Duplicate Queries</span>
              <span className="stat-value" style={{ color: '#ef4444' }}>{stats.duplicateAlerts}</span>
              <div className="card-accent" style={{ '--accent': '#ef4444' } as any} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="detail-section">
              <div className="detail-section-title">Slowest DB Operations</div>
              {stats.slowestOps.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px' }}>No database queries recorded.</div>
              ) : (
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '6px' }}>Table</th>
                      <th style={{ padding: '6px' }}>Op</th>
                      <th style={{ padding: '6px', textAlign: 'right' }}>Time (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.slowestOps.map((op) => (
                      <tr key={op.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => selectOperation(op.id)}>
                        <td style={{ padding: '6px', fontWeight: 600 }}>{op.table}</td>
                        <td style={{ padding: '6px' }}><span style={{ color: OP_TYPE_COLORS[op.operationType] }}>{op.operationType}</span></td>
                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700, color: op.executionTime > SLOW_QUERY_THRESHOLD_MS ? '#ef4444' : 'var(--text-main)' }}>{op.executionTime} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="detail-section">
              <div className="detail-section-title">N+1 / Duplicate Warnings</div>
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredOps.filter(o => o.isDuplicate || o.isN1).length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px' }}>All clear! No N+1 or duplicates flagged.</div>
                ) : (
                  filteredOps.filter(o => o.isDuplicate || o.isN1).map((op) => (
                    <div key={op.id} className="tree-node-row" onClick={() => selectOperation(op.id)} style={{ borderLeft: op.isDuplicate ? '3px solid #ef4444' : '3px solid #f97316', paddingLeft: '8px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Flow: {op.requestFlowId.slice(0, 8)}…</div>
                        <div style={{ fontWeight: 600 }}>{op.operationType} {op.table}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {op.isDuplicate && <span style={{ background: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>DUPLICATE</span>}
                        {op.isN1 && <span style={{ background: '#f97316', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>N+1 ALERT</span>}
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
        <section className="ops-panel">
          <div className="operations-list-card">
            <div className="card-header">
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Operations Trace (Flow Tree)</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                  />
                  📌 Auto-scroll
                </label>
                {!autoScroll && (
                  <button className="btn" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setAutoScroll(true)}>
                    Re-enable Auto-Scroll
                  </button>
                )}
              </div>
            </div>

            <div className="scrollable-area" ref={listContainerRef} onScroll={handleScroll}>
              {treeData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No operations recorded. Trigger some queries or click around.
                </div>
              ) : (
                treeData.map((node) => <TreeItem key={node.key} node={node} onSelect={selectOperation} selectedId={selectedOperationId} />)
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="detail-section">
              <div className="detail-section-title">How to Trigger Tracking</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <ol style={{ paddingLeft: '16px', margin: '4px 0' }}>
                  <li>Go to auth pages (Login or Register).</li>
                  <li>Click buttons or fill forms to trigger database and query cache calls.</li>
                  <li>Operations will dynamically populate this feed in real-time.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── TAB CONTENT: TIMELINE / FLAME CHART ─── */}
      {activeTab === 'timeline' && (
        <section>
          <div className="detail-section" style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Select Request Flow to View Timeline:</label>
            <select
              className="filter-input"
              style={{ width: '100%', maxWidth: '400px' }}
              value={selectedFlowId}
              onChange={(e) => setSelectedFlowId(e.target.value)}
            >
              {flows.map((f) => (
                <option key={f.id} value={f.id}>
                  Flow {f.id.slice(0, 8)}… ({f.feature}) — {new Date(f.timestamp).toLocaleTimeString()}
                </option>
              ))}
            </select>
          </div>

          {selectedFlowId && flowOps.length > 0 ? (
            <div>
              <div className="flame-chart-container">
                <div style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  Flame Chart (Layer Gantt Trace)
                </div>
                <div className="flame-chart">
                  {/* We group flowOps by layers to construct rows */}
                  {(['ui', 'hook', 'service', 'query', 'repository', 'database'] as LayerName[]).map((layer) => {
                    const layerItems = flowOps.filter((o) => {
                      if (layer === 'ui') return o.component && o.component !== 'unknown';
                      if (layer === 'hook') return o.hook && o.hook !== 'unknown';
                      if (layer === 'service') return o.service && o.service !== 'unknown';
                      if (layer === 'query') return o.queryOrCommand && o.queryOrCommand !== 'unknown' && !o.table;
                      if (layer === 'repository') return o.repository && o.repository !== 'unknown';
                      if (layer === 'database') return o.table;
                      return false;
                    });

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
                                {item.table || item.hook || item.service || item.id.slice(0, 4)} ({Math.round(item.completedAt - item.startedAt)}ms)
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
              <div className="detail-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>Scrub Timeline Replay</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Step {replayIndex} of {flowOps.length}
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max={flowOps.length}
                  value={replayIndex}
                  onChange={(e) => setReplayIndex(Number(e.target.value))}
                  style={{ width: '100%', marginBottom: '16px' }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No request flows found.</div>
          )}
        </section>
      )}

      {/* ─── TAB CONTENT: CALL GRAPH ─── */}
      {activeTab === 'call-graph' && (
        <section>
          <div className="svg-card">
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Directed Call Chain Graph (SVG)</div>
            {callGraph.nodes.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No active nodes in current query filter to draw Call Graph.
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <svg width="100%" height="400" style={{ minWidth: '800px' }}>
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="15" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border)" />
                    </marker>
                  </defs>
                  {(() => {
                    const columns = {
                      ui: 50,
                      hook: 180,
                      service: 310,
                      query: 440,
                      repository: 570,
                      database: 700,
                      cache: 700,
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
                        {callGraph.edges.map((edge, idx) => {
                          const start = positions[edge.from];
                          const end = positions[edge.to];
                          if (!start || !end) return null;
                          return (
                            <line
                              key={idx}
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
                              style={{ cursor: 'pointer' }}
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
        <section>
          <div className="svg-card">
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Service ➔ Repository ➔ Query Architecture Map</div>
            {dependencyGraph.nodes.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No operations to map dependencies. Run some requests.
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <svg width="100%" height="400" style={{ minWidth: '800px' }}>
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
                        {dependencyGraph.edges.map((edge, idx) => {
                          const start = positions[edge.from];
                          const end = positions[edge.to];
                          if (!start || !end) return null;
                          return (
                            <path
                              key={idx}
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
                                count: {node.count}
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
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div className="detail-section">
            <div className="detail-section-title">Most Active Features</div>
            {stats.mostActiveFeatures.map((f, i) => (
              <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{i+1}. {f.name}</span>
                <span style={{ fontWeight: 'bold' }}>{f.count} ops</span>
              </div>
            ))}
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Most Active Pages</div>
            {stats.mostActivePages.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{i+1}. {p.name}</span>
                <span style={{ fontWeight: 'bold' }}>{p.count} ops</span>
              </div>
            ))}
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Most Active Tables</div>
            {stats.mostActiveTables.map((t, i) => (
              <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{i+1}. {t.name}</span>
                <span style={{ fontWeight: 'bold' }}>{t.count} ops</span>
              </div>
            ))}
          </div>

          <div className="detail-section">
            <div className="detail-section-title">Most Active Repositories</div>
            {stats.mostActiveRepositories.map((r, i) => (
              <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{i+1}. {r.name}</span>
                <span style={{ fontWeight: 'bold' }}>{r.count} ops</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── TAB CONTENT: PINNED ─── */}
      {activeTab === 'pinned' && (
        <section>
          <div className="operations-list-card" style={{ height: 'auto', minHeight: '300px' }}>
            <div className="card-header">
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>📌 Pinned Operations</h2>
            </div>
            <div className="scrollable-area">
              {operations.filter((o) => o.pinned).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No pinned operations. Hover over an item in the trace view and click the ⭐ to pin.
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
                      ⭐ Unpin
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── OPERATION DETAILS DRAWER ─── */}
      <div className={`drawer ${activeOp ? 'open' : ''}`}>
        <div className="drawer-header">
          <span className="drawer-title">Operation Details</span>
          <button className="btn" onClick={() => selectOperation(null)}>✕ Close</button>
        </div>

        {activeOp && (
          <div className="drawer-body">
            <div className="detail-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {activeOp.table ? `${activeOp.operationType} ${activeOp.table}` : activeOp.queryKey || 'Query'}
                </span>
                <button
                  className="btn"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => togglePin(activeOp.id)}
                >
                  {activeOp.pinned ? '⭐ Pinned' : '☆ Pin to Top'}
                </button>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Trace Information</div>
              <div className="info-grid">
                <span className="info-label">Correlation ID:</span>
                <span className="info-value" style={{ fontFamily: 'monospace' }}>{activeOp.correlationId.slice(0, 16)}</span>

                <span className="info-label">Flow ID:</span>
                <span className="info-value" style={{ fontFamily: 'monospace' }}>{activeOp.requestFlowId.slice(0, 16)}</span>

                <span className="info-label">Feature:</span>
                <span className="info-value">{activeOp.feature}</span>

                <span className="info-label">Page Route:</span>
                <span className="info-value">{activeOp.page}</span>

                <span className="info-label">Hook:</span>
                <span className="info-value">{activeOp.hook}</span>

                <span className="info-label">Service:</span>
                <span className="info-value">{activeOp.service}</span>

                <span className="info-label">Repository:</span>
                <span className="info-value">{activeOp.repository}</span>

                <span className="info-label">DB Driver:</span>
                <span className="info-value" style={{ color: activeOp.dbDriver === 'Turso-Production' ? '#ef4444' : '#22c55e' }}>
                  {activeOp.dbDriver}
                </span>

                <span className="info-label">Status:</span>
                <span className="info-value" style={{ color: STATUS_COLORS[activeOp.status] }}>
                  {activeOp.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Performance Metrics</div>
              <div className="info-grid">
                <span className="info-label">Execution Duration:</span>
                <span className="info-value" style={{ color: activeOp.executionTime > SLOW_QUERY_THRESHOLD_MS ? '#ef4444' : '#22c55e', fontWeight: 800 }}>
                  {activeOp.executionTime} ms
                </span>

                <span className="info-label">Memory Delta:</span>
                <span className="info-value">
                  {activeOp.memoryDelta != null
                    ? `${(activeOp.memoryDelta / 1024).toFixed(2)} KB`
                    : 'N/A (Performance.memory disabled)'}
                </span>

                <span className="info-label">Rows Read:</span>
                <span className="info-value">{activeOp.rowsRead}</span>

                <span className="info-label">Rows Written:</span>
                <span className="info-value">{activeOp.rowsWritten}</span>
              </div>
            </div>

            {activeOp.sql && (
              <div className="detail-section">
                <div className="detail-section-title">Raw Executed SQL</div>
                <pre className="code-block">{activeOp.sql}</pre>
                {activeOp.params && activeOp.params.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div className="detail-section-title">Query Parameters</div>
                    <pre className="code-block">{JSON.stringify(activeOp.params, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}

            {diffResult && (
              <div className="detail-section">
                <div className="detail-section-title">Query Result Diff (Before ➔ After)</div>
                <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', overflowX: 'auto', maxHeight: '250px' }}>
                  {diffResult.map((line, idx) => (
                    <span
                      key={idx}
                      className={`diff-line ${line.type === 'added' ? 'diff-added' : line.type === 'removed' ? 'diff-removed' : ''}`}
                    >
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '} {line.text}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeOp.errorMessage && (
              <div className="detail-section" style={{ borderColor: '#ef4444' }}>
                <div className="detail-section-title" style={{ color: '#ef4444' }}>Error Message</div>
                <div style={{ color: '#f87171', fontSize: '13px', fontWeight: 600 }}>{activeOp.errorMessage}</div>
                {activeOp.executionStack && (
                  <div style={{ marginTop: '8px' }}>
                    <div className="detail-section-title" style={{ color: '#ef4444' }}>Execution Stack Trace</div>
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

// ─── Recursive Collapsible Tree Item Component ──────────────────────────────
interface TreeItemProps {
  node: TreeNode;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
}

function TreeItem({ node, onSelect, selectedId }: TreeItemProps) {
  const [isOpen, setIsOpen] = React.useState<boolean>(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="tree-node">
      <div
        className="tree-node-row"
        onClick={() => {
          if (hasChildren) {
            setIsOpen(!isOpen);
          } else if (node.records && node.records[0]) {
            onSelect(node.records[0].id);
          }
        }}
        style={{
          background: selectedId && node.records?.[0]?.id === selectedId ? 'var(--bg-hover)' : '',
          borderLeft: !hasChildren ? `2px solid ${node.records?.[0]?.table ? LAYER_COLORS.database : LAYER_COLORS.hook}` : '',
        }}
      >
        <div className="tree-node-info">
          {hasChildren && <span>{isOpen ? '▼' : '▶'}</span>}
          {!hasChildren && <div className="layer-dot" style={{ background: node.records?.[0]?.table ? LAYER_COLORS.database : LAYER_COLORS.hook }} />}
          <span style={{ fontWeight: hasChildren ? 'bold' : 'normal' }}>{node.label}</span>
          {hasChildren && <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({node.count})</span>}
        </div>

        {!hasChildren && node.records?.[0] && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: STATUS_COLORS[node.records[0].status], fontSize: '11px', fontWeight: 'bold' }}>
              {node.records[0].status.toUpperCase()}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {Math.round(node.records[0].executionTime || node.records[0].completedAt - node.records[0].startedAt)}ms
            </span>
          </div>
        )}
      </div>

      {isOpen && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeItem key={child.key} node={child} onSelect={onSelect} selectedId={selectedId} />
          ))}
        </div>
      )}
    </div>
  );
}
