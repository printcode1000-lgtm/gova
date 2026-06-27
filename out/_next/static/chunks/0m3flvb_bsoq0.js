(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,31988,e=>{"use strict";var s=e.i(43476),t=e.i(71645),a=e.i(18566),r=e.i(80584),i=e.i(98930);e.i(79641);var l=e.i(80919);function n(){let[e,a]=(0,t.useState)(null),[r,i]=(0,t.useState)(null),[n,d]=(0,t.useState)(!0);return((0,t.useEffect)(()=>{l.govaApi.getPublicJson("/sync_data/schema-sync-report.json").then(e=>{a(e),i(null)}).catch(e=>{a(null),i(e instanceof Error?e.message:"Failed to load schema sync report")}).finally(()=>d(!1))},[]),n)?(0,s.jsx)("div",{style:{padding:16},children:"Loading schema sync report…"}):r?(0,s.jsxs)("div",{style:{padding:16},children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Schema Sync"}),(0,s.jsx)("p",{style:{color:"#f97316"},children:r}),(0,s.jsxs)("p",{style:{opacity:.7,fontSize:13},children:["Run ",(0,s.jsx)("code",{children:"npm run db:schema:sync"})," or deploy the GOVA backend to generate the report."]})]}):e?(0,s.jsxs)("div",{style:{padding:16},children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Schema Sync"}),e.skipped?(0,s.jsxs)("p",{style:{color:"#f97316"},children:["Skipped: ",e.skipReason]}):(0,s.jsxs)(s.Fragment,{children:[(0,s.jsxs)("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:12,marginBottom:16},children:[(0,s.jsx)(o,{label:"SQLite Version",value:e.sqliteSchemaVersion}),(0,s.jsx)(o,{label:"Turso Before",value:e.tursoSchemaVersionBefore}),(0,s.jsx)(o,{label:"Turso After",value:e.tursoSchemaVersionAfter}),(0,s.jsx)(o,{label:"Duration",value:`${e.durationMs}ms`}),(0,s.jsx)(o,{label:"Tables Modified",value:String(e.tablesModified)}),(0,s.jsx)(o,{label:"Columns Added",value:String(e.columnsAdded)}),(0,s.jsx)(o,{label:"Indexes Added",value:String(e.indexesAdded)}),(0,s.jsx)(o,{label:"Views Added",value:String(e.viewsAdded)}),(0,s.jsx)(o,{label:"Triggers Added",value:String(e.triggersAdded)})]}),(0,s.jsxs)("p",{style:{opacity:.7,fontSize:13,marginBottom:12},children:["Executed at: ",e.executedAt]}),e.operations.length>0&&(0,s.jsxs)(s.Fragment,{children:[(0,s.jsxs)("div",{className:"detail-section-title",children:["Operations (",e.operations.length,")"]}),(0,s.jsx)("ul",{style:{fontSize:13,marginBottom:16},children:e.operations.map((e,t)=>(0,s.jsxs)("li",{children:[(0,s.jsx)("strong",{children:e.type}),": ",e.description]},`${e.type}-${t}`))})]}),e.sqlExecuted.length>0&&(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)("div",{className:"detail-section-title",children:"SQL Executed"}),(0,s.jsx)("pre",{style:{fontSize:12,overflow:"auto",background:"rgba(0,0,0,0.2)",padding:12,borderRadius:8},children:e.sqlExecuted.join("\n\n")})]}),e.warnings.length>0&&(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Warnings"}),(0,s.jsx)("ul",{style:{color:"#f97316",fontSize:13},children:e.warnings.map((e,t)=>(0,s.jsx)("li",{children:e},t))})]}),e.errors.length>0&&(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Errors"}),(0,s.jsx)("ul",{style:{color:"#ef4444",fontSize:13},children:e.errors.map((e,t)=>(0,s.jsx)("li",{children:e},t))})]})]})]}):null}function o({label:e,value:t}){return(0,s.jsxs)("div",{style:{background:"rgba(255,255,255,0.04)",padding:12,borderRadius:8},children:[(0,s.jsx)("div",{style:{fontSize:11,opacity:.6,marginBottom:4},children:e}),(0,s.jsx)("div",{style:{fontFamily:"monospace",fontSize:13},children:t})]})}function d({node:e,onSelect:a,selectedId:r}){let[l,n]=t.useState(!0),o=e.children&&e.children.length>0;return(0,s.jsxs)("div",{className:"tree-node",children:[(0,s.jsxs)("div",{className:"tree-node-row",onClick:()=>{o?n(!l):e.records&&e.records[0]&&a(e.records[0].id)},style:{background:r&&e.records?.[0]?.id===r?"var(--bg-hover)":"",borderLeft:o?"":`2px solid ${e.records?.[0]?.table?i.LAYER_COLORS.database:i.LAYER_COLORS.hook}`},children:[(0,s.jsxs)("div",{className:"tree-node-info",children:[o&&(0,s.jsx)("span",{children:l?"▼":"▶"}),!o&&(0,s.jsx)("div",{className:"layer-dot",style:{background:e.records?.[0]?.table?i.LAYER_COLORS.database:i.LAYER_COLORS.hook}}),(0,s.jsx)("span",{style:{fontWeight:o?"bold":"normal"},children:e.label}),o&&(0,s.jsxs)("span",{style:{color:"var(--text-muted)",fontSize:"11px"},children:["(",e.count,")"]})]}),!o&&e.records?.[0]&&(0,s.jsxs)("div",{style:{display:"flex",gap:"8px",alignItems:"center"},children:[(0,s.jsx)("span",{style:{color:i.STATUS_COLORS[e.records[0].status],fontSize:"11px",fontWeight:"bold"},children:e.records[0].status.toUpperCase()}),(0,s.jsxs)("span",{style:{fontSize:"11px",color:"var(--text-muted)"},children:[Math.round(e.records[0].executionTime||e.records[0].completedAt-e.records[0].startedAt),"ms"]})]})]}),l&&o&&(0,s.jsx)("div",{children:e.children.map(e=>(0,s.jsx)(d,{node:e,onSelect:a,selectedId:r},e.key))})]})}e.i(97643),e.i(95648).isDevelopment||(0,a.notFound)(),e.s(["default",0,function(){let e,a,l,o,c,p,{operations:x,isLive:h,filter:m,selectedOperationId:u,activeTab:f,theme:g,autoScroll:v,toggleLive:j,clear:b,setFilter:y,resetFilter:N,selectOperation:w,setActiveTab:k,toggleTheme:S,togglePin:C,setAutoScroll:A,exportJSON:T,exportHTML:R,exportPDF:E,getFilteredOps:O,getStats:z,getCallGraph:L,getDependencyGraph:D,getTreeData:M}=(0,r.useMonitorStore)(),W=O(),q=z(),B=M(),F=L(),I=D(),$=t.useMemo(()=>x.find(e=>e.id===u)||null,[x,u]),P=t.useMemo(()=>$&&$.previousResult?function(e,s){let t=e.split("\n"),a=s.split("\n"),r=[],i=0,l=0;for(;i<t.length||l<a.length;)if(i<t.length&&l<a.length)if(t[i]===a[l])r.push({type:"normal",text:t[i]}),i++,l++;else{let e=a.indexOf(t[i],l);if(-1!==e&&e-l<5){for(let s=l;s<e;s++)r.push({type:"added",text:a[s]});l=e}else r.push({type:"removed",text:t[i]}),i++}else i<t.length?(r.push({type:"removed",text:t[i]}),i++):(r.push({type:"added",text:a[l]}),l++);return r}(JSON.stringify($.previousResult,null,2),JSON.stringify($.currentResult,null,2)):null,[$]),[H,_]=t.useState(""),Y=t.useMemo(()=>Array.from(new Set(x.map(e=>e.requestFlowId))).map(e=>{let s=x.find(s=>s.requestFlowId===e);return{id:e,feature:s?.feature??"unknown",timestamp:s?.timestamp??""}}),[x]);t.useEffect(()=>{Y.length>0&&!H&&_(Y[0].id)},[Y,H]);let Q=t.useMemo(()=>x.filter(e=>e.requestFlowId===H),[x,H]),[K,U]=t.useState(0);t.useEffect(()=>{U(Q.length)},[Q]);let V=t.useRef(null);t.useEffect(()=>{v&&V.current&&(V.current.scrollTop=V.current.scrollHeight)},[x,v]),t.useEffect(()=>{document.documentElement.setAttribute("data-monitor-theme",g)},[g]);let G=t.useMemo(()=>{let e={features:new Set,pages:new Set,components:new Set,hooks:new Set,services:new Set,repositories:new Set,tables:new Set,entities:new Set,queryKeys:new Set};return x.forEach(s=>{s.feature&&e.features.add(s.feature),s.page&&e.pages.add(s.page),s.component&&e.components.add(s.component),s.hook&&e.hooks.add(s.hook),s.service&&e.services.add(s.service),s.repository&&e.repositories.add(s.repository),s.table&&e.tables.add(s.table),s.entity&&e.entities.add(s.entity),s.queryKey&&e.queryKeys.add(s.queryKey)}),{features:Array.from(e.features),pages:Array.from(e.pages),components:Array.from(e.components),hooks:Array.from(e.hooks),services:Array.from(e.services),repositories:Array.from(e.repositories),tables:Array.from(e.tables),entities:Array.from(e.entities),queryKeys:Array.from(e.queryKeys)}},[x]);return(0,s.jsxs)("div",{className:"monitor-container",children:[(0,s.jsx)("style",{dangerouslySetInnerHTML:{__html:`
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
      `}}),(0,s.jsxs)("header",{className:"header no-print",children:[(0,s.jsxs)("div",{className:"header-title",children:[(0,s.jsx)("h1",{children:"GoVa Operation Monitor"}),h&&(0,s.jsx)("span",{className:"badge-live",children:"LIVE MONITORING"})]}),(0,s.jsxs)("div",{className:"header-actions",children:[(0,s.jsx)("button",{className:"btn",onClick:S,children:"dark"===g?"☀️ Light Mode":"🌙 Dark Mode"}),(0,s.jsx)("button",{className:"btn",onClick:j,children:h?"⏸️ Pause Stream":"▶️ Resume Stream"}),(0,s.jsx)("button",{className:"btn",onClick:b,children:"🗑️ Clear logs"}),(0,s.jsx)("button",{className:"btn",onClick:T,children:"📥 Export JSON"}),(0,s.jsx)("button",{className:"btn",onClick:R,children:"📄 Export HTML"}),(0,s.jsx)("button",{className:"btn",onClick:E,children:"🖨️ Print PDF"})]})]}),(0,s.jsx)("nav",{className:"tabs no-print",children:["dashboard","operations","timeline","call-graph","dependency","analytics","schema-sync","pinned"].map(e=>(0,s.jsx)("button",{className:`tab-btn ${f===e?"active":""}`,onClick:()=>k(e),children:e.toUpperCase()},e))}),(0,s.jsxs)("div",{className:"filters-panel no-print",children:[(0,s.jsxs)("div",{className:"filters-grid",children:[(0,s.jsxs)("div",{className:"filter-group",children:[(0,s.jsx)("label",{children:"Feature"}),(0,s.jsxs)("select",{className:"filter-input",value:m.feature,onChange:e=>y({feature:e.target.value}),children:[(0,s.jsx)("option",{value:"",children:"All Features"}),G.features.map(e=>(0,s.jsx)("option",{value:e,children:e},e))]})]}),(0,s.jsxs)("div",{className:"filter-group",children:[(0,s.jsx)("label",{children:"Page"}),(0,s.jsxs)("select",{className:"filter-input",value:m.page,onChange:e=>y({page:e.target.value}),children:[(0,s.jsx)("option",{value:"",children:"All Pages"}),G.pages.map(e=>(0,s.jsx)("option",{value:e,children:e},e))]})]}),(0,s.jsxs)("div",{className:"filter-group",children:[(0,s.jsx)("label",{children:"Component"}),(0,s.jsxs)("select",{className:"filter-input",value:m.component,onChange:e=>y({component:e.target.value}),children:[(0,s.jsx)("option",{value:"",children:"All Components"}),G.components.map(e=>(0,s.jsx)("option",{value:e,children:e},e))]})]}),(0,s.jsxs)("div",{className:"filter-group",children:[(0,s.jsx)("label",{children:"Hook"}),(0,s.jsxs)("select",{className:"filter-input",value:m.hook,onChange:e=>y({hook:e.target.value}),children:[(0,s.jsx)("option",{value:"",children:"All Hooks"}),G.hooks.map(e=>(0,s.jsx)("option",{value:e,children:e},e))]})]}),(0,s.jsxs)("div",{className:"filter-group",children:[(0,s.jsx)("label",{children:"Service"}),(0,s.jsxs)("select",{className:"filter-input",value:m.service,onChange:e=>y({service:e.target.value}),children:[(0,s.jsx)("option",{value:"",children:"All Services"}),G.services.map(e=>(0,s.jsx)("option",{value:e,children:e},e))]})]}),(0,s.jsxs)("div",{className:"filter-group",children:[(0,s.jsx)("label",{children:"Repository"}),(0,s.jsxs)("select",{className:"filter-input",value:m.repository,onChange:e=>y({repository:e.target.value}),children:[(0,s.jsx)("option",{value:"",children:"All Repositories"}),G.repositories.map(e=>(0,s.jsx)("option",{value:e,children:e},e))]})]}),(0,s.jsxs)("div",{className:"filter-group",children:[(0,s.jsx)("label",{children:"Table"}),(0,s.jsxs)("select",{className:"filter-input",value:m.table,onChange:e=>y({table:e.target.value}),children:[(0,s.jsx)("option",{value:"",children:"All Tables"}),G.tables.map(e=>(0,s.jsx)("option",{value:e,children:e},e))]})]}),(0,s.jsxs)("div",{className:"filter-group",children:[(0,s.jsx)("label",{children:"Entity"}),(0,s.jsxs)("select",{className:"filter-input",value:m.entity,onChange:e=>y({entity:e.target.value}),children:[(0,s.jsx)("option",{value:"",children:"All Entities"}),G.entities.map(e=>(0,s.jsx)("option",{value:e,children:e},e))]})]}),(0,s.jsxs)("div",{className:"filter-group",children:[(0,s.jsx)("label",{children:"Query Key"}),(0,s.jsxs)("select",{className:"filter-input",value:m.queryKey,onChange:e=>y({queryKey:e.target.value}),children:[(0,s.jsx)("option",{value:"",children:"All Query Keys"}),G.queryKeys.map(e=>(0,s.jsx)("option",{value:e,children:e},e))]})]}),(0,s.jsxs)("div",{className:"filter-group",children:[(0,s.jsx)("label",{children:"Op Type"}),(0,s.jsxs)("select",{className:"filter-input",value:m.operationType,onChange:e=>y({operationType:e.target.value}),children:[(0,s.jsx)("option",{value:"",children:"All Types"}),(0,s.jsx)("option",{value:"SELECT",children:"SELECT"}),(0,s.jsx)("option",{value:"INSERT",children:"INSERT"}),(0,s.jsx)("option",{value:"UPDATE",children:"UPDATE"}),(0,s.jsx)("option",{value:"DELETE",children:"DELETE"})]})]}),(0,s.jsxs)("div",{className:"filter-group",children:[(0,s.jsx)("label",{children:"Status"}),(0,s.jsxs)("select",{className:"filter-input",value:m.status,onChange:e=>y({status:e.target.value}),children:[(0,s.jsx)("option",{value:"",children:"All Statuses"}),(0,s.jsx)("option",{value:"success",children:"Success"}),(0,s.jsx)("option",{value:"pending",children:"Pending"}),(0,s.jsx)("option",{value:"error",children:"Error"})]})]}),(0,s.jsxs)("div",{className:"filter-group",children:[(0,s.jsx)("label",{children:"DB Driver"}),(0,s.jsxs)("select",{className:"filter-input",value:m.dbDriver,onChange:e=>y({dbDriver:e.target.value}),children:[(0,s.jsx)("option",{value:"",children:"All Drivers"}),(0,s.jsx)("option",{value:"SQLite-Dev",children:"SQLite Dev"}),(0,s.jsx)("option",{value:"Turso-Production",children:"Turso Production"})]})]}),(0,s.jsxs)("div",{className:"filter-group",children:[(0,s.jsx)("label",{children:"Cache Source"}),(0,s.jsxs)("select",{className:"filter-input",value:m.cacheSource,onChange:e=>y({cacheSource:e.target.value}),children:[(0,s.jsx)("option",{value:"",children:"All Cache Sources"}),(0,s.jsx)("option",{value:"Memory",children:"Memory Cache"}),(0,s.jsx)("option",{value:"IndexedDB",children:"IndexedDB"}),(0,s.jsx)("option",{value:"Database",children:"Database Source"})]})]})]}),(0,s.jsxs)("div",{className:"search-bar",children:[(0,s.jsx)("input",{className:"filter-input search-input",placeholder:"Type features, SQL, hooks, query keys, error messages to search...",value:m.search,onChange:e=>y({search:e.target.value})}),(0,s.jsx)("button",{className:"btn",onClick:N,children:"Reset Filters"})]})]}),"dashboard"===f&&(0,s.jsxs)("section",{children:[(0,s.jsxs)("div",{className:"stats-grid",children:[(0,s.jsxs)("div",{className:"stat-card",children:[(0,s.jsx)("span",{className:"stat-title",children:"Total Operations"}),(0,s.jsx)("span",{className:"stat-value",children:W.length}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#3b82f6"}})]}),(0,s.jsxs)("div",{className:"stat-card",children:[(0,s.jsx)("span",{className:"stat-title",children:"Reads (SELECT)"}),(0,s.jsx)("span",{className:"stat-value",children:q.totalReads}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#22c55e"}})]}),(0,s.jsxs)("div",{className:"stat-card",children:[(0,s.jsx)("span",{className:"stat-title",children:"Writes (MUTATIONS)"}),(0,s.jsx)("span",{className:"stat-value",children:q.totalWrites}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#ef4444"}})]}),(0,s.jsxs)("div",{className:"stat-card",children:[(0,s.jsx)("span",{className:"stat-title",children:"Total DB Calls"}),(0,s.jsx)("span",{className:"stat-value",children:q.totalDbCalls}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#a855f7"}})]}),(0,s.jsxs)("div",{className:"stat-card",children:[(0,s.jsx)("span",{className:"stat-title",children:"Cache Hits"}),(0,s.jsx)("span",{className:"stat-value",children:q.totalCacheHits}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#eab308"}})]}),(0,s.jsxs)("div",{className:"stat-card",children:[(0,s.jsx)("span",{className:"stat-title",children:"Cache Misses"}),(0,s.jsx)("span",{className:"stat-value",children:q.totalCacheMisses}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#a855f7"}})]}),(0,s.jsxs)("div",{className:"stat-card",children:[(0,s.jsx)("span",{className:"stat-title",children:"Cache Hit Rate"}),(0,s.jsxs)("span",{className:"stat-value",children:[q.cacheHitRate,"%"]}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#eab308"}})]}),(0,s.jsxs)("div",{className:"stat-card",children:[(0,s.jsx)("span",{className:"stat-title",children:"Active Queries"}),(0,s.jsx)("span",{className:"stat-value",children:q.activeQueries}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#06b6d4"}})]}),(0,s.jsxs)("div",{className:"stat-card",children:[(0,s.jsx)("span",{className:"stat-title",children:"Active Mutations"}),(0,s.jsx)("span",{className:"stat-value",children:q.activeMutations}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#f97316"}})]}),(0,s.jsxs)("div",{className:"stat-card",children:[(0,s.jsx)("span",{className:"stat-title",children:"Offline Reads"}),(0,s.jsx)("span",{className:"stat-value",children:q.offlineReads}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#64748b"}})]}),(0,s.jsxs)("div",{className:"stat-card",children:[(0,s.jsx)("span",{className:"stat-title",children:"Online Reads"}),(0,s.jsx)("span",{className:"stat-value",children:q.onlineReads}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#3b82f6"}})]}),(0,s.jsxs)("div",{className:"stat-card",children:[(0,s.jsx)("span",{className:"stat-title",children:"Avg DB Time"}),(0,s.jsxs)("span",{className:"stat-value",children:[q.avgExecutionTime," ms"]}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#ef4444"}})]}),(0,s.jsxs)("div",{className:"stat-card alert",children:[(0,s.jsx)("span",{className:"stat-title",children:"N+1 Query Alerts"}),(0,s.jsx)("span",{className:"stat-value",style:{color:"#f97316"},children:q.n1Alerts}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#f97316"}})]}),(0,s.jsxs)("div",{className:"stat-card error",children:[(0,s.jsx)("span",{className:"stat-title",children:"Duplicate Queries"}),(0,s.jsx)("span",{className:"stat-value",style:{color:"#ef4444"},children:q.duplicateAlerts}),(0,s.jsx)("div",{className:"card-accent",style:{"--accent":"#ef4444"}})]})]}),(0,s.jsxs)("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[(0,s.jsxs)("div",{className:"detail-section",children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Slowest DB Operations"}),0===q.slowestOps.length?(0,s.jsx)("div",{style:{fontSize:"13px",color:"var(--text-muted)",padding:"8px"},children:"No database queries recorded."}):(0,s.jsxs)("table",{style:{width:"100%",fontSize:"12px",borderCollapse:"collapse"},children:[(0,s.jsx)("thead",{children:(0,s.jsxs)("tr",{style:{borderBottom:"1px solid var(--border)",textAlign:"left",color:"var(--text-muted)"},children:[(0,s.jsx)("th",{style:{padding:"6px"},children:"Table"}),(0,s.jsx)("th",{style:{padding:"6px"},children:"Op"}),(0,s.jsx)("th",{style:{padding:"6px",textAlign:"right"},children:"Time (ms)"})]})}),(0,s.jsx)("tbody",{children:q.slowestOps.map(e=>(0,s.jsxs)("tr",{style:{borderBottom:"1px solid var(--border)",cursor:"pointer"},onClick:()=>w(e.id),children:[(0,s.jsx)("td",{style:{padding:"6px",fontWeight:600},children:e.table}),(0,s.jsx)("td",{style:{padding:"6px"},children:(0,s.jsx)("span",{style:{color:i.OP_TYPE_COLORS[e.operationType]},children:e.operationType})}),(0,s.jsxs)("td",{style:{padding:"6px",textAlign:"right",fontWeight:700,color:e.executionTime>i.SLOW_QUERY_THRESHOLD_MS?"#ef4444":"var(--text-main)"},children:[e.executionTime," ms"]})]},e.id))})]})]}),(0,s.jsxs)("div",{className:"detail-section",children:[(0,s.jsx)("div",{className:"detail-section-title",children:"N+1 / Duplicate Warnings"}),(0,s.jsx)("div",{style:{maxHeight:"200px",overflowY:"auto",display:"flex",flexDirection:"column",gap:"8px"},children:0===W.filter(e=>e.isDuplicate||e.isN1).length?(0,s.jsx)("div",{style:{fontSize:"13px",color:"var(--text-muted)",padding:"8px"},children:"All clear! No N+1 or duplicates flagged."}):W.filter(e=>e.isDuplicate||e.isN1).map(e=>(0,s.jsxs)("div",{className:"tree-node-row",onClick:()=>w(e.id),style:{borderLeft:e.isDuplicate?"3px solid #ef4444":"3px solid #f97316",paddingLeft:"8px"},children:[(0,s.jsxs)("div",{children:[(0,s.jsxs)("div",{style:{fontSize:"11px",color:"var(--text-muted)"},children:["Flow: ",e.requestFlowId.slice(0,8),"…"]}),(0,s.jsxs)("div",{style:{fontWeight:600},children:[e.operationType," ",e.table]})]}),(0,s.jsxs)("div",{style:{display:"flex",gap:"4px"},children:[e.isDuplicate&&(0,s.jsx)("span",{style:{background:"#ef4444",color:"white",fontSize:"10px",padding:"2px 6px",borderRadius:"4px",fontWeight:"bold"},children:"DUPLICATE"}),e.isN1&&(0,s.jsx)("span",{style:{background:"#f97316",color:"white",fontSize:"10px",padding:"2px 6px",borderRadius:"4px",fontWeight:"bold"},children:"N+1 ALERT"})]})]},e.id))})]})]})]}),"operations"===f&&(0,s.jsxs)("section",{className:"ops-panel",children:[(0,s.jsxs)("div",{className:"operations-list-card",children:[(0,s.jsxs)("div",{className:"card-header",children:[(0,s.jsx)("h2",{style:{fontSize:"16px",fontWeight:800,margin:0},children:"Operations Trace (Flow Tree)"}),(0,s.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"10px"},children:[(0,s.jsxs)("label",{style:{fontSize:"12px",display:"flex",alignItems:"center",gap:"4px",cursor:"pointer"},children:[(0,s.jsx)("input",{type:"checkbox",checked:v,onChange:e=>A(e.target.checked)}),"📌 Auto-scroll"]}),!v&&(0,s.jsx)("button",{className:"btn",style:{padding:"4px 8px",fontSize:"11px"},onClick:()=>A(!0),children:"Re-enable Auto-Scroll"})]})]}),(0,s.jsx)("div",{className:"scrollable-area",ref:V,onScroll:e=>{if(!v)return;let s=e.currentTarget;s.scrollHeight-s.scrollTop-s.clientHeight<20||A(!1)},children:0===B.length?(0,s.jsx)("div",{style:{textAlign:"center",padding:"40px",color:"var(--text-muted)"},children:"No operations recorded. Trigger some queries or click around."}):B.map(e=>(0,s.jsx)(d,{node:e,onSelect:w,selectedId:u},e.key))})]}),(0,s.jsx)("div",{style:{display:"flex",flexDirection:"column",gap:"20px"},children:(0,s.jsxs)("div",{className:"detail-section",children:[(0,s.jsx)("div",{className:"detail-section-title",children:"How to Trigger Tracking"}),(0,s.jsx)("div",{style:{fontSize:"12px",color:"var(--text-muted)",lineHeight:"1.5"},children:(0,s.jsxs)("ol",{style:{paddingLeft:"16px",margin:"4px 0"},children:[(0,s.jsx)("li",{children:"Go to auth pages (Login or Register)."}),(0,s.jsx)("li",{children:"Click buttons or fill forms to trigger database and query cache calls."}),(0,s.jsx)("li",{children:"Operations will dynamically populate this feed in real-time."})]})})]})})]}),"timeline"===f&&(0,s.jsxs)("section",{children:[(0,s.jsxs)("div",{className:"detail-section",style:{marginBottom:"16px"},children:[(0,s.jsx)("label",{style:{fontSize:"13px",fontWeight:600,display:"block",marginBottom:"6px"},children:"Select Request Flow to View Timeline:"}),(0,s.jsx)("select",{className:"filter-input",style:{width:"100%",maxWidth:"400px"},value:H,onChange:e=>_(e.target.value),children:Y.map(e=>(0,s.jsxs)("option",{value:e.id,children:["Flow ",e.id.slice(0,8),"… (",e.feature,") — ",new Date(e.timestamp).toLocaleTimeString()]},e.id))})]}),H&&Q.length>0?(0,s.jsxs)("div",{children:[(0,s.jsxs)("div",{className:"flame-chart-container",children:[(0,s.jsx)("div",{style:{fontSize:"14px",fontWeight:700,borderBottom:"1px solid var(--border)",paddingBottom:"8px"},children:"Flame Chart (Layer Gantt Trace)"}),(0,s.jsx)("div",{className:"flame-chart",children:["ui","hook","service","query","repository","database"].map(e=>{let t=Q.filter(s=>"ui"===e?s.component&&"unknown"!==s.component:"hook"===e?s.hook&&"unknown"!==s.hook:"service"===e?s.service&&"unknown"!==s.service:"query"===e?s.queryOrCommand&&"unknown"!==s.queryOrCommand&&!s.table:"repository"===e?s.repository&&"unknown"!==s.repository:"database"===e&&s.table),a=Q.map(e=>e.startedAt),r=Q.map(e=>e.completedAt),l=Math.min(...a),n=Math.max(...r)-l||1;return(0,s.jsxs)("div",{className:"flame-row",children:[(0,s.jsx)("div",{className:"flame-row-label",children:e}),(0,s.jsx)("div",{className:"flame-bars-container",children:t.map(t=>{let a=(t.startedAt-l)/n*100,r=Math.max((t.completedAt-t.startedAt)/n*100,1.5);return(0,s.jsxs)("div",{className:"flame-bar",onClick:()=>w(t.id),style:{left:`${a}%`,width:`${r}%`,background:i.LAYER_COLORS[e]},children:[t.table||t.hook||t.service||t.id.slice(0,4)," (",Math.round(t.completedAt-t.startedAt),"ms)"]},t.id)})})]},e)})})]}),(0,s.jsxs)("div",{className:"detail-section",children:[(0,s.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"},children:[(0,s.jsx)("div",{style:{fontSize:"14px",fontWeight:700},children:"Scrub Timeline Replay"}),(0,s.jsxs)("div",{style:{fontSize:"12px",color:"var(--text-muted)"},children:["Step ",K," of ",Q.length]})]}),(0,s.jsx)("input",{type:"range",min:"0",max:Q.length,value:K,onChange:e=>U(Number(e.target.value)),style:{width:"100%",marginBottom:"16px"}}),(0,s.jsx)("div",{style:{display:"flex",flexDirection:"column",gap:"8px"},children:Q.slice(0,K).map((e,t)=>(0,s.jsxs)("div",{className:"tree-node-row",style:{borderLeft:`3px solid ${e.table?i.LAYER_COLORS.database:i.LAYER_COLORS.hook}`},onClick:()=>w(e.id),children:[(0,s.jsxs)("div",{children:[(0,s.jsxs)("span",{style:{color:"var(--text-muted)",marginRight:"8px"},children:["#",t+1]}),(0,s.jsx)("span",{style:{fontWeight:600},children:e.table?`${e.operationType} ${e.table}`:e.queryKey||e.id.slice(0,8)})]}),(0,s.jsxs)("div",{style:{fontSize:"12px",color:"var(--text-muted)"},children:["+",Math.round(e.executionTime),"ms"]})]},e.id))})]})]}):(0,s.jsx)("div",{style:{padding:"40px",textAlign:"center",color:"var(--text-muted)"},children:"No request flows found."})]}),"call-graph"===f&&(0,s.jsx)("section",{children:(0,s.jsxs)("div",{className:"svg-card",children:[(0,s.jsx)("div",{style:{fontSize:"14px",fontWeight:700,marginBottom:"12px"},children:"Directed Call Chain Graph (SVG)"}),0===F.nodes.length?(0,s.jsx)("div",{style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-muted)"},children:"No active nodes in current query filter to draw Call Graph."}):(0,s.jsx)("div",{style:{flex:1,overflow:"auto",border:"1px solid var(--border)",borderRadius:"8px"},children:(0,s.jsxs)("svg",{width:"100%",height:"400",style:{minWidth:"800px"},children:[(0,s.jsx)("defs",{children:(0,s.jsx)("marker",{id:"arrow",viewBox:"0 0 10 10",refX:"15",refY:"5",markerWidth:"6",markerHeight:"6",orient:"auto-start-reverse",children:(0,s.jsx)("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:"var(--border)"})})}),(e={ui:50,hook:180,service:310,query:440,repository:570,database:700,cache:700},a={},l={},F.nodes.forEach(s=>{let t=s.layer;void 0===a[t]&&(a[t]=0);let r=e[t]||50,i=40+60*a[t];a[t]++,l[s.id]={x:r,y:i}}),(0,s.jsxs)("g",{children:[F.edges.map((e,t)=>{let a=l[e.from],r=l[e.to];return a&&r?(0,s.jsx)("line",{x1:a.x,y1:a.y,x2:r.x,y2:r.y,stroke:"var(--border)",strokeWidth:"2",markerEnd:"url(#arrow)"},t):null}),F.nodes.map(e=>{let t=l[e.id];if(!t)return null;let a=i.LAYER_COLORS[e.layer]||"#64748b";return(0,s.jsxs)("g",{transform:`translate(${t.x-30}, ${t.y-20})`,style:{cursor:"pointer"},onClick:()=>w(e.recordId),children:[(0,s.jsx)("rect",{width:"60",height:"40",rx:"6",fill:a,stroke:"rgba(255,255,255,0.15)",strokeWidth:"1"}),(0,s.jsx)("text",{x:"30",y:"24",textAnchor:"middle",fill:"white",fontSize:"9",fontWeight:"bold",children:e.label.slice(0,10)})]},e.id)})]}))]})})]})}),"dependency"===f&&(0,s.jsx)("section",{children:(0,s.jsxs)("div",{className:"svg-card",children:[(0,s.jsx)("div",{style:{fontSize:"14px",fontWeight:700,marginBottom:"12px"},children:"Service ➔ Repository ➔ Query Architecture Map"}),0===I.nodes.length?(0,s.jsx)("div",{style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text-muted)"},children:"No operations to map dependencies. Run some requests."}):(0,s.jsx)("div",{style:{flex:1,overflow:"auto",border:"1px solid var(--border)",borderRadius:"8px"},children:(0,s.jsxs)("svg",{width:"100%",height:"400",style:{minWidth:"800px"},children:[(0,s.jsx)("defs",{children:(0,s.jsx)("marker",{id:"dep-arrow",viewBox:"0 0 10 10",refX:"25",refY:"5",markerWidth:"6",markerHeight:"6",orient:"auto-start-reverse",children:(0,s.jsx)("path",{d:"M 0 0 L 10 5 L 0 10 z",fill:"#3b82f6"})})}),(o={service:100,repository:400,query:700},c={},p={},I.nodes.forEach(e=>{let s=e.type;void 0===c[s]&&(c[s]=0);let t=o[s]||100,a=60+80*c[s];c[s]++,p[e.id]={x:t,y:a}}),(0,s.jsxs)("g",{children:[I.edges.map((e,t)=>{let a=p[e.from],r=p[e.to];return a&&r?(0,s.jsx)("path",{d:`M ${a.x} ${a.y} C ${(a.x+r.x)/2} ${a.y}, ${(a.x+r.x)/2} ${r.y}, ${r.x} ${r.y}`,stroke:"#3b82f6",strokeWidth:"1.5",fill:"none",markerEnd:"url(#dep-arrow)"},t):null}),I.nodes.map(e=>{let t=p[e.id];if(!t)return null;let a="service"===e.type?"#22c55e":"repository"===e.type?"#a855f7":"#f97316";return(0,s.jsxs)("g",{transform:`translate(${t.x-75}, ${t.y-25})`,children:[(0,s.jsx)("rect",{width:"150",height:"50",rx:"8",fill:"var(--bg-card)",stroke:a,strokeWidth:"2"}),(0,s.jsx)("text",{x:"75",y:"24",textAnchor:"middle",fill:"var(--text-main)",fontSize:"10",fontWeight:"bold",children:e.label.slice(0,22)}),(0,s.jsxs)("text",{x:"75",y:"40",textAnchor:"middle",fill:"var(--text-muted)",fontSize:"8",children:["count: ",e.count]})]},e.id)})]}))]})})]})}),"analytics"===f&&(0,s.jsxs)("section",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:"20px"},children:[(0,s.jsxs)("div",{className:"detail-section",children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Most Active Features"}),q.mostActiveFeatures.map((e,t)=>(0,s.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--border)"},children:[(0,s.jsxs)("span",{children:[t+1,". ",e.name]}),(0,s.jsxs)("span",{style:{fontWeight:"bold"},children:[e.count," ops"]})]},e.name))]}),(0,s.jsxs)("div",{className:"detail-section",children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Most Active Pages"}),q.mostActivePages.map((e,t)=>(0,s.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--border)"},children:[(0,s.jsxs)("span",{children:[t+1,". ",e.name]}),(0,s.jsxs)("span",{style:{fontWeight:"bold"},children:[e.count," ops"]})]},e.name))]}),(0,s.jsxs)("div",{className:"detail-section",children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Most Active Tables"}),q.mostActiveTables.map((e,t)=>(0,s.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--border)"},children:[(0,s.jsxs)("span",{children:[t+1,". ",e.name]}),(0,s.jsxs)("span",{style:{fontWeight:"bold"},children:[e.count," ops"]})]},e.name))]}),(0,s.jsxs)("div",{className:"detail-section",children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Most Active Repositories"}),q.mostActiveRepositories.map((e,t)=>(0,s.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--border)"},children:[(0,s.jsxs)("span",{children:[t+1,". ",e.name]}),(0,s.jsxs)("span",{style:{fontWeight:"bold"},children:[e.count," ops"]})]},e.name))]})]}),"schema-sync"===f&&(0,s.jsx)("section",{children:(0,s.jsx)(n,{})}),"pinned"===f&&(0,s.jsx)("section",{children:(0,s.jsxs)("div",{className:"operations-list-card",style:{height:"auto",minHeight:"300px"},children:[(0,s.jsx)("div",{className:"card-header",children:(0,s.jsx)("h2",{style:{fontSize:"16px",fontWeight:800,margin:0},children:"📌 Pinned Operations"})}),(0,s.jsx)("div",{className:"scrollable-area",children:0===x.filter(e=>e.pinned).length?(0,s.jsx)("div",{style:{textAlign:"center",padding:"40px",color:"var(--text-muted)"},children:"No pinned operations. Hover over an item in the trace view and click the ⭐ to pin."}):x.filter(e=>e.pinned).map(e=>(0,s.jsxs)("div",{className:"tree-node-row",onClick:()=>w(e.id),children:[(0,s.jsxs)("div",{className:"tree-node-info",children:[(0,s.jsx)("div",{className:"layer-dot",style:{background:e.table?i.LAYER_COLORS.database:i.LAYER_COLORS.hook}}),(0,s.jsx)("span",{style:{fontWeight:600},children:e.table?`${e.operationType} ${e.table}`:e.queryKey||e.id}),(0,s.jsxs)("span",{style:{color:"var(--text-muted)",fontSize:"11px"},children:["(",e.feature,")"]})]}),(0,s.jsx)("button",{className:"btn",style:{padding:"2px 8px",fontSize:"10px"},onClick:s=>{s.stopPropagation(),C(e.id)},children:"⭐ Unpin"})]},e.id))})]})}),(0,s.jsxs)("div",{className:`drawer ${$?"open":""}`,children:[(0,s.jsxs)("div",{className:"drawer-header",children:[(0,s.jsx)("span",{className:"drawer-title",children:"Operation Details"}),(0,s.jsx)("button",{className:"btn",onClick:()=>w(null),children:"✕ Close"})]}),$&&(0,s.jsxs)("div",{className:"drawer-body",children:[(0,s.jsx)("div",{className:"detail-section",children:(0,s.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[(0,s.jsx)("span",{style:{fontSize:"14px",fontWeight:"bold"},children:$.table?`${$.operationType} ${$.table}`:$.queryKey||"Query"}),(0,s.jsx)("button",{className:"btn",style:{padding:"4px 10px",fontSize:"12px"},onClick:()=>C($.id),children:$.pinned?"⭐ Pinned":"☆ Pin to Top"})]})}),(0,s.jsxs)("div",{className:"detail-section",children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Trace Information"}),(0,s.jsxs)("div",{className:"info-grid",children:[(0,s.jsx)("span",{className:"info-label",children:"Correlation ID:"}),(0,s.jsx)("span",{className:"info-value",style:{fontFamily:"monospace"},children:$.correlationId.slice(0,16)}),(0,s.jsx)("span",{className:"info-label",children:"Flow ID:"}),(0,s.jsx)("span",{className:"info-value",style:{fontFamily:"monospace"},children:$.requestFlowId.slice(0,16)}),(0,s.jsx)("span",{className:"info-label",children:"Feature:"}),(0,s.jsx)("span",{className:"info-value",children:$.feature}),(0,s.jsx)("span",{className:"info-label",children:"Page Route:"}),(0,s.jsx)("span",{className:"info-value",children:$.page}),(0,s.jsx)("span",{className:"info-label",children:"Hook:"}),(0,s.jsx)("span",{className:"info-value",children:$.hook}),(0,s.jsx)("span",{className:"info-label",children:"Service:"}),(0,s.jsx)("span",{className:"info-value",children:$.service}),(0,s.jsx)("span",{className:"info-label",children:"Repository:"}),(0,s.jsx)("span",{className:"info-value",children:$.repository}),(0,s.jsx)("span",{className:"info-label",children:"DB Driver:"}),(0,s.jsx)("span",{className:"info-value",style:{color:"Turso-Production"===$.dbDriver?"#ef4444":"#22c55e"},children:$.dbDriver}),(0,s.jsx)("span",{className:"info-label",children:"Status:"}),(0,s.jsx)("span",{className:"info-value",style:{color:i.STATUS_COLORS[$.status]},children:$.status.toUpperCase()})]})]}),(0,s.jsxs)("div",{className:"detail-section",children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Performance Metrics"}),(0,s.jsxs)("div",{className:"info-grid",children:[(0,s.jsx)("span",{className:"info-label",children:"Execution Duration:"}),(0,s.jsxs)("span",{className:"info-value",style:{color:$.executionTime>i.SLOW_QUERY_THRESHOLD_MS?"#ef4444":"#22c55e",fontWeight:800},children:[$.executionTime," ms"]}),(0,s.jsx)("span",{className:"info-label",children:"Memory Delta:"}),(0,s.jsx)("span",{className:"info-value",children:null!=$.memoryDelta?`${($.memoryDelta/1024).toFixed(2)} KB`:"N/A (Performance.memory disabled)"}),(0,s.jsx)("span",{className:"info-label",children:"Rows Read:"}),(0,s.jsx)("span",{className:"info-value",children:$.rowsRead}),(0,s.jsx)("span",{className:"info-label",children:"Rows Written:"}),(0,s.jsx)("span",{className:"info-value",children:$.rowsWritten})]})]}),$.sql&&(0,s.jsxs)("div",{className:"detail-section",children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Raw Executed SQL"}),(0,s.jsx)("pre",{className:"code-block",children:$.sql}),$.params&&$.params.length>0&&(0,s.jsxs)("div",{style:{marginTop:"8px"},children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Query Parameters"}),(0,s.jsx)("pre",{className:"code-block",children:JSON.stringify($.params,null,2)})]})]}),P&&(0,s.jsxs)("div",{className:"detail-section",children:[(0,s.jsx)("div",{className:"detail-section-title",children:"Query Result Diff (Before ➔ After)"}),(0,s.jsx)("div",{style:{background:"#0f172a",padding:"10px",borderRadius:"6px",overflowX:"auto",maxHeight:"250px"},children:P.map((e,t)=>(0,s.jsxs)("span",{className:`diff-line ${"added"===e.type?"diff-added":"removed"===e.type?"diff-removed":""}`,children:["added"===e.type?"+":"removed"===e.type?"-":" "," ",e.text]},t))})]}),$.errorMessage&&(0,s.jsxs)("div",{className:"detail-section",style:{borderColor:"#ef4444"},children:[(0,s.jsx)("div",{className:"detail-section-title",style:{color:"#ef4444"},children:"Error Message"}),(0,s.jsx)("div",{style:{color:"#f87171",fontSize:"13px",fontWeight:600},children:$.errorMessage}),$.executionStack&&(0,s.jsxs)("div",{style:{marginTop:"8px"},children:[(0,s.jsx)("div",{className:"detail-section-title",style:{color:"#ef4444"},children:"Execution Stack Trace"}),(0,s.jsx)("pre",{className:"code-block",style:{color:"#f87171",background:"#181111"},children:$.executionStack})]})]})]})]})]})}],31988)}]);