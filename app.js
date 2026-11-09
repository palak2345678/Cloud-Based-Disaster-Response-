const { useState, useEffect, useRef, useMemo } = React;

// API Client
const API = {
  getStats: () => fetch('/api/dashboard/stats').then(r => r.json()),
  getMapData: () => fetch('/api/dashboard/map-data').then(r => r.json()),
  getIncidents: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`/api/incidents${q ? '?' + q : ''}`).then(r => r.json());
  },
  getIncident: (id) => fetch(`/api/incidents/${id}`).then(r => r.json()),
  reportIncident: (data) => fetch('/api/incidents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(async r => {
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.detail || 'Failed to report incident');
    }
    return r.json();
  }),
  resolveIncident: (id) => fetch(`/api/incidents/${id}/resolve`, { method: 'POST' }).then(r => r.json()),
  deleteIncident: (id) => fetch(`/api/incidents/${id}`, { method: 'DELETE' }).then(r => r.json()),

  getResources: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`/api/resources${q ? '?' + q : ''}`).then(r => r.json());
  },
  addResource: (data) => fetch('/api/resources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(async r => {
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.detail || 'Failed to add resource');
    }
    return r.json();
  }),
  releaseResource: (id) => fetch(`/api/resources/${id}/release`, { method: 'POST' }).then(r => r.json()),
  updateResourceStatus: (id, status) => fetch(`/api/resources/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  }).then(r => r.json()),

  runAllocation: () => fetch('/api/allocations/run', { method: 'POST' }).then(r => r.json()),
  getAllocations: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`/api/allocations${q ? '?' + q : ''}`).then(r => r.json());
  },
  getAuditLogs: () => fetch('/api/allocations/logs?limit=40').then(r => r.json()),

  // Future AI Architecture APIs
  getAiInfo: () => fetch('/api/ai/info').then(r => r.json()),
  simulateAi: (data) => fetch('/api/ai/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  // College Presentation Demo Mode APIs
  demoReset: () => fetch('/api/demo/reset', { method: 'POST' }).then(r => r.json()),
  demoStep: (stepId) => fetch(`/api/demo/step/${stepId}`, { method: 'POST' }).then(r => r.json())
};

// Location Presets for Quick Disaster Intake
const LOCATION_PRESETS = [
  { name: "Downtown Commercial Core", lat: 28.6328, lon: 77.2197 },
  { name: "Okhla Industrial Area Phase II", lat: 28.5355, lon: 77.2732 },
  { name: "Wazirabad Riverfront Settlement", lat: 28.7112, lon: 77.2345 },
  { name: "Eastern Expressway Junction KM 24", lat: 28.5721, lon: 77.3102 },
  { name: "Northern Ridge Hill Byway", lat: 28.6850, lon: 77.2050 },
  { name: "Tech Park & Metro Sector 62", lat: 28.6270, lon: 77.3620 }
];

const RESOURCE_TYPES = [
  "Ambulance",
  "Rescue Team",
  "Fire Brigade",
  "Medical Kit & Staff",
  "Food & Drinking Water",
  "Evacuation Boat",
  "Heavy Earthmover"
];

const DISASTER_TYPES = [
  "Earthquake",
  "Flood",
  "Urban Fire",
  "Wildfire",
  "Cyclone",
  "Industrial Chemical Leak",
  "Landslide",
  "Building Collapse",
  "Tsunami"
];

// Clean SVGs
const Icons = {
  Dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Alert: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  List: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  Truck: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 17a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM5 17H3a2 2 0 01-2-2V6a2 2 0 012-2h11v11h-2a2 2 0 01-4 0H9a2 2 0 01-4 0zm11-8h4l3 3v3h-2a2 2 0 01-4 0h-1V9z" /></svg>,
  Cpu: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>,
  Layers: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>,
  Refresh: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Play: () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>,
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>,
  Info: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  MapPin: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  GraduationCap: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
};

// Severity Badge
function SeverityBadge({ severity, score, showScore = true }) {
  const styles = {
    Critical: "bg-red-950/80 text-red-400 border border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.35)]",
    High: "bg-orange-950/80 text-orange-400 border border-orange-500/60 shadow-[0_0_10px_rgba(249,115,22,0.25)]",
    Medium: "bg-yellow-950/80 text-yellow-300 border border-yellow-500/50",
    Low: "bg-emerald-950/80 text-emerald-400 border border-emerald-500/50"
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${styles[severity] || styles.Low}`}>
      <span className={`w-2 h-2 rounded-full ${severity === 'Critical' ? 'bg-red-400 animate-ping' : severity === 'High' ? 'bg-orange-400' : severity === 'Medium' ? 'bg-yellow-400' : 'bg-emerald-400'}`}></span>
      <span>{severity}</span>
      {showScore && score !== undefined && (
        <span className="font-mono text-[11px] opacity-80 border-l border-white/20 pl-1.5 ml-0.5">
          {score.toFixed(3)}
        </span>
      )}
    </span>
  );
}

// Status Badge
function StatusBadge({ status }) {
  const styles = {
    "Waiting for Resources": "bg-amber-950/80 text-amber-300 border border-amber-500/50",
    "Pending": "bg-amber-950/80 text-amber-300 border border-amber-500/50",
    "Fully Allocated": "bg-emerald-950/80 text-emerald-300 border border-emerald-500/50",
    "Assigned": "bg-emerald-950/80 text-emerald-300 border border-emerald-500/50",
    "Active": "bg-cyan-950/80 text-cyan-300 border border-cyan-500/50",
    "Partially Satisfied": "bg-purple-950/80 text-purple-300 border border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.3)]",
    "Resolved": "bg-slate-800/80 text-slate-400 border border-slate-700",
    "Available": "bg-emerald-950/80 text-emerald-300 border border-emerald-500/50",
    "Deployed": "bg-blue-950/80 text-blue-300 border border-blue-500/50",
    "Released": "bg-slate-800 text-slate-300 border border-slate-600"
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-slate-800 text-slate-300'}`}>
      {status}
    </span>
  );
}

// Main Application
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [mapData, setMapData] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isAllocating, setIsAllocating] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date().toUTCString());
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Toast System
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toUTCString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all live operational data from SQLite
  const refreshAllData = async () => {
    try {
      const [s, inc, res, alloc, logs, map] = await Promise.all([
        API.getStats(),
        API.getIncidents(),
        API.getResources(),
        API.getAllocations(),
        API.getAuditLogs(),
        API.getMapData()
      ]);
      setStats(s);
      setIncidents(inc);
      setResources(res);
      setAllocations(alloc);
      setAuditLogs(logs);
      setMapData(map);
    } catch (err) {
      console.error("Data refresh error:", err);
      addToast("Failed to fetch latest operational data", "error");
    }
  };

  useEffect(() => {
    refreshAllData();
    const interval = setInterval(refreshAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Manual Trigger for Greedy Allocation Engine
  const handleRunAllocation = async () => {
    setIsAllocating(true);
    try {
      const result = await API.runAllocation();
      addToast(result.message || "Greedy allocation completed", "success");
      await refreshAllData();
    } catch (err) {
      addToast(err.message || "Allocation engine failure", "error");
    } finally {
      setIsAllocating(false);
    }
  };

  // Resolve Incident Action (releases resources & triggers auto-reallocation)
  const handleResolveIncident = async (id) => {
    if (!confirm(`Confirm resolution of Incident ${id}? All assigned emergency resources will be released and automatically re-allocated to waiting high-priority incidents.`)) return;
    try {
      const res = await API.resolveIncident(id);
      addToast(`Incident ${id} marked Resolved. Freed resources auto-reallocated!`, "success");
      await refreshAllData();
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  // Release Resource Action
  const handleReleaseResource = async (id) => {
    try {
      await API.releaseResource(id);
      addToast(`Resource ${id} released. Priority-based auto-reallocation completed.`, "success");
      await refreshAllData();
    } catch (err) {
      addToast(err.message, "error");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0d14] text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#101522] border-r border-[#1f293d] flex flex-col flex-shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-4 border-b border-[#1f293d]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-amber-600 rounded-lg shadow-lg shadow-red-500/20 text-white">
              <Icons.Shield />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">DISASTER RESPONSE</h1>
              <p className="text-[11px] text-cyan-400 font-mono tracking-wider">COORDINATION PLATFORM</p>
            </div>
          </div>

          <div className="mt-3 px-2 py-1 bg-red-950/40 border border-red-500/30 rounded text-[11px] text-red-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              LIVE EOC ACTIVE
            </span>
            <span className="font-mono text-[10px] text-slate-400">PBL-SYS</span>
          </div>
        </div>

        {/* Demo Mode Presentation Banner */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setShowDemoModal(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-950 to-blue-950 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 shadow-md text-xs font-bold transition-all active:scale-95"
          >
            <div className="flex items-center gap-2">
              <Icons.GraduationCap />
              <span>COLLEGE DEMO MODE</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Coordinator Dashboard', icon: Icons.Dashboard, badge: stats?.active_incidents },
            { id: 'report', label: 'Report Incident', icon: Icons.Alert, highlight: true },
            { id: 'incidents', label: 'Incidents & Scoring', icon: Icons.List, badge: stats?.critical_count ? `${stats.critical_count} Crit` : null, badgeColor: 'bg-red-600' },
            { id: 'resources', label: 'Live Resources', icon: Icons.Truck, badge: stats ? `${stats.available_resources}/${stats.total_resources}` : null },
            { id: 'allocations', label: 'Allocation Engine', icon: Icons.Layers, badge: stats?.partially_satisfied_count ? `${stats.partially_satisfied_count} Short` : null, badgeColor: 'bg-purple-600' },
            { id: 'ai', label: 'AI Prediction (RF)', icon: Icons.Cpu, badge: 'Future AI' }
          ].map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-950/50'
                    : item.highlight
                    ? 'text-amber-300 hover:bg-amber-950/30 hover:text-amber-200 border border-amber-600/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Allocation Trigger */}
        <div className="p-3 border-t border-[#1f293d] space-y-2">
          <button
            onClick={handleRunAllocation}
            disabled={isAllocating}
            className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg ${
              isAllocating
                ? 'bg-cyan-900 text-cyan-300 cursor-wait'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 active:scale-95'
            }`}
          >
            <Icons.Play />
            <span>{isAllocating ? 'PROCESSING DISPATCH...' : 'EXECUTE ALLOCATION'}</span>
          </button>
          <div className="text-[10px] text-center text-slate-500 font-mono">
            Priority & Haversine Dispatcher
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-[#101522]/90 backdrop-blur-md border-b border-[#1f293d] px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold tracking-tight text-white capitalize">
              {activeTab === 'dashboard' && 'Emergency Operations Center Dashboard'}
              {activeTab === 'report' && 'Incident Intake & Priority Scoring Evaluation'}
              {activeTab === 'incidents' && 'Incident Triage & Explainable Priority Matrix'}
              {activeTab === 'resources' && 'Emergency Resource Fleet Management'}
              {activeTab === 'allocations' && 'Greedy Resource Allocation Engine & Audit Trail'}
              {activeTab === 'ai' && 'Random Forest Severity Prediction – Future Enhancement'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Clock */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[11px] font-mono text-cyan-400 tracking-wider">SYSTEM TIME (UTC)</span>
              <span className="text-xs font-mono text-slate-300">{currentTime}</span>
            </div>

            {/* Presentation Mode Button */}
            <button
              onClick={() => setShowDemoModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow transition-all"
            >
              <Icons.GraduationCap />
              <span className="hidden sm:inline">DEMO SCENARIO</span>
            </button>

            {/* Refresh */}
            <button
              onClick={refreshAllData}
              title="Refresh platform telemetry"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
            >
              <Icons.Refresh />
            </button>

            {/* Quick Report Emergency */}
            <button
              onClick={() => setActiveTab('report')}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-lg shadow-red-600/30 transition-all active:scale-95"
            >
              <Icons.Plus />
              <span>REPORT EMERGENCY</span>
            </button>
          </div>
        </header>

        {/* Tab View Container */}
        <main className="p-6 flex-1 space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              mapData={mapData}
              incidents={incidents}
              resources={resources}
              auditLogs={auditLogs}
              onSelectIncident={(inc) => {
                setSelectedIncident(inc);
                setActiveTab('incidents');
              }}
              onRunAllocation={handleRunAllocation}
              onResolveIncident={handleResolveIncident}
            />
          )}

          {activeTab === 'report' && (
            <ReportIncidentView
              submissionResult={submissionResult}
              setSubmissionResult={setSubmissionResult}
              onSuccess={(newInc) => {
                addToast(`Emergency ${newInc.id} recorded with ${newInc.severity_level} severity!`, 'success');
                refreshAllData();
              }}
              onGoDashboard={() => {
                setSubmissionResult(null);
                refreshAllData();
                setActiveTab('dashboard');
              }}
              onGoIncidents={() => {
                setSubmissionResult(null);
                refreshAllData();
                setActiveTab('incidents');
              }}
            />
          )}

          {activeTab === 'incidents' && (
            <IncidentsView
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
              onResolve={handleResolveIncident}
              onDelete={async (id) => {
                if (confirm(`Delete incident ${id}?`)) {
                  await API.deleteIncident(id);
                  addToast(`Incident ${id} deleted`, 'info');
                  refreshAllData();
                }
              }}
            />
          )}

          {activeTab === 'resources' && (
            <ResourcesView
              resources={resources}
              onRefresh={refreshAllData}
              onRelease={handleReleaseResource}
              addToast={addToast}
            />
          )}

          {activeTab === 'allocations' && (
            <AllocationEngineView
              stats={stats}
              allocations={allocations}
              auditLogs={auditLogs}
              onRunAllocation={handleRunAllocation}
              isAllocating={isAllocating}
              onReleaseResource={handleReleaseResource}
            />
          )}

          {activeTab === 'ai' && (
            <AiPredictionView addToast={addToast} />
          )}
        </main>
      </div>

      {/* Floating Toast Alerts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`p-3.5 rounded-lg shadow-xl text-xs font-medium border flex items-center gap-3 pointer-events-auto transform transition-all animate-bounce ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/60'
                : toast.type === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-500/60'
                : 'bg-slate-900/90 text-cyan-200 border-cyan-500/60'
            }`}
          >
            <Icons.Info />
            <div className="flex-1">{toast.message}</div>
          </div>
        ))}
      </div>

      {/* Priority Scoring Breakdown Modal */}
      {selectedIncident && (
        <ScoringBreakdownModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onResolve={handleResolveIncident}
        />
      )}

      {/* College Presentation Demo Mode Modal */}
      {showDemoModal && (
        <DemoScenarioModal
          onClose={() => setShowDemoModal(false)}
          onRefreshAll={refreshAllData}
          onNavigate={(tab) => {
            setActiveTab(tab);
            setShowDemoModal(false);
          }}
          addToast={addToast}
        />
      )}
    </div>
  );
}

// ==========================================
// 1. DASHBOARD VIEW COMPONENT
// ==========================================
function DashboardView({ stats, mapData, incidents, resources, auditLogs, onSelectIncident, onRunAllocation, onResolveIncident }) {
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);

  // Initialize and update Charts dynamically whenever stats updates
  useEffect(() => {
    if (!stats) return;

    // Severity Donut Chart
    const ctx1 = document.getElementById('severityDonutChart');
    if (ctx1) {
      if (chartRef1.current) chartRef1.current.destroy();
      chartRef1.current = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: ['Critical', 'High', 'Medium', 'Low'],
          datasets: [{
            data: [
              stats.critical_count || 0,
              stats.high_count || 0,
              stats.medium_count || 0,
              stats.low_count || 0
            ],
            backgroundColor: ['#ef4444', '#f97316', '#eab308', '#10b981'],
            borderColor: '#111726',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 11 } }
            }
          },
          cutout: '68%'
        }
      });
    }

    // Resource Fleet Bar Chart
    const ctx2 = document.getElementById('resourceBarChart');
    if (ctx2 && stats.resource_breakdown) {
      if (chartRef2.current) chartRef2.current.destroy();
      const labels = stats.resource_breakdown.map(r => r.resource_type);
      const availableData = stats.resource_breakdown.map(r => r.available_units);
      const deployedData = stats.resource_breakdown.map(r => r.deployed_units);

      chartRef2.current = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Available Units',
              data: availableData,
              backgroundColor: '#10b981',
              borderRadius: 4
            },
            {
              label: 'Deployed Units',
              data: deployedData,
              backgroundColor: '#3b82f6',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { color: '#1e293b' }
            },
            y: {
              beginAtZero: true,
              ticks: { color: '#94a3b8', stepSize: 1, font: { size: 10 } },
              grid: { color: '#1e293b' }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: { color: '#94a3b8', font: { size: 11 } }
            }
          }
        }
      });
    }

    return () => {
      if (chartRef1.current) chartRef1.current.destroy();
      if (chartRef2.current) chartRef2.current.destroy();
    };
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* 8-Card Dynamic Telemetry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Active Incidents */}
        <div className="bg-[#111726] border border-[#232f48] rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Active Incidents</div>
          <div className="text-2xl font-bold text-white mt-1">{stats?.active_incidents ?? 0}</div>
          <div className="text-[10px] text-cyan-400 mt-1 font-mono">{stats?.total_incidents ?? 0} Total logged</div>
        </div>

        {/* Critical */}
        <div className="bg-[#1a111a] border border-red-500/40 rounded-xl p-3.5 shadow-md shadow-red-950/30 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 m-2 animate-ping"></div>
          <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Critical</div>
          <div className="text-2xl font-extrabold text-red-400 mt-1">{stats?.critical_count ?? 0}</div>
          <div className="text-[10px] text-red-400/80 mt-1 font-mono">Score ≥ 0.65</div>
        </div>

        {/* High */}
        <div className="bg-[#1b1511] border border-orange-500/40 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">High</div>
          <div className="text-2xl font-bold text-orange-400 mt-1">{stats?.high_count ?? 0}</div>
          <div className="text-[10px] text-orange-400/80 mt-1 font-mono">Score ≥ 0.45</div>
        </div>

        {/* Medium */}
        <div className="bg-[#1a1911] border border-yellow-500/30 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div className="text-[11px] font-bold text-yellow-300 uppercase tracking-wider">Medium</div>
          <div className="text-2xl font-bold text-yellow-300 mt-1">{stats?.medium_count ?? 0}</div>
          <div className="text-[10px] text-yellow-300/80 mt-1 font-mono">Score ≥ 0.25</div>
        </div>

        {/* Low */}
        <div className="bg-[#101b17] border border-emerald-500/30 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Low</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats?.low_count ?? 0}</div>
          <div className="text-[10px] text-emerald-400/80 mt-1 font-mono">Score &lt; 0.25</div>
        </div>

        {/* Available Fleet */}
        <div className="bg-[#111726] border border-emerald-500/30 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div className="text-[11px] font-medium text-emerald-300 uppercase tracking-wider">Available Fleet</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats?.available_resources ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">{stats?.available_units ?? 0} units ready</div>
        </div>

        {/* Deployed Fleet */}
        <div className="bg-[#111726] border border-blue-500/30 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div className="text-[11px] font-medium text-blue-300 uppercase tracking-wider">Deployed</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats?.deployed_resources ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">{stats?.deployed_units ?? 0} units deployed</div>
        </div>

        {/* Partially Satisfied / Shortage */}
        <div className="bg-[#181126] border border-purple-500/40 rounded-xl p-3.5 shadow-md flex flex-col justify-between">
          <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">Partial Demand</div>
          <div className="text-2xl font-bold text-purple-300 mt-1">{stats?.partially_satisfied_count ?? 0}</div>
          <div className="text-[10px] text-purple-300/80 mt-1 font-mono">Shortage flagged</div>
        </div>
      </div>

      {/* Interactive Map & Telemetry Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Disaster Map (2 cols) */}
        <div className="lg:col-span-2 bg-[#111726] border border-[#232f48] rounded-2xl p-4 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></span>
              <h3 className="font-bold text-sm tracking-wide text-white uppercase">Live Incident & Resource Deployment Map</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Incident</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Base Depot</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-cyan-400"></span> Dispatch Route</span>
            </div>
          </div>

          <div className="flex-1 min-h-[380px] rounded-xl overflow-hidden border border-[#232f48] relative">
            <InteractiveLeafletMap mapData={mapData} onResolve={onResolveIncident} onSelectIncident={onSelectIncident} />
          </div>
        </div>

        {/* Recent Emergency Alerts Feed (1 col) */}
        <div className="bg-[#111726] border border-[#232f48] rounded-2xl p-4 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#232f48]">
            <h3 className="font-bold text-sm tracking-wide text-white uppercase flex items-center gap-2">
              <Icons.Alert />
              <span>Emergency Log Feed</span>
            </h3>
            <span className="text-[10px] font-mono text-cyan-400">REALTIME</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[380px]">
            {auditLogs && auditLogs.length > 0 ? (
              auditLogs.slice(0, 8).map(log => (
                <div key={log.id} className="p-2.5 rounded-lg bg-[#161f33] border border-[#232f48] text-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className="text-cyan-400 font-semibold">{log.event_type}</span>
                    <span className="text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-200 line-clamp-2">{log.message}</p>
                  {log.incident_id && (
                    <span className="inline-block mt-1 font-mono text-[10px] text-amber-400 bg-amber-950/40 px-1.5 py-0.2 rounded">
                      {log.incident_id}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">No alerts recorded yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Charts & Top Priority Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Donut Chart */}
        <div className="bg-[#111726] border border-[#232f48] rounded-2xl p-4 shadow-xl flex flex-col">
          <h3 className="font-bold text-sm tracking-wide text-white uppercase mb-2">Severity Distribution (Active)</h3>
          <div className="flex-1 min-h-[220px] relative">
            <canvas id="severityDonutChart"></canvas>
          </div>
          <div className="mt-2 pt-2 border-t border-[#232f48] grid grid-cols-2 text-center text-xs">
            <div>
              <span className="text-red-400 font-bold">{stats?.critical_count || 0}</span> Critical
            </div>
            <div>
              <span className="text-orange-400 font-bold">{stats?.high_count || 0}</span> High
            </div>
          </div>
        </div>

        {/* Resource Allocation Grouped Bar Chart */}
        <div className="bg-[#111726] border border-[#232f48] rounded-2xl p-4 shadow-xl flex flex-col">
          <h3 className="font-bold text-sm tracking-wide text-white uppercase mb-2">Resource Fleet Breakdown</h3>
          <div className="flex-1 min-h-[220px] relative">
            <canvas id="resourceBarChart"></canvas>
          </div>
          <div className="mt-2 pt-2 border-t border-[#232f48] flex justify-between text-xs px-2 text-slate-400 font-mono">
            <span>{stats?.available_resources || 0} Avail Units</span>
            <span>{stats?.deployed_resources || 0} Deployed Units</span>
          </div>
        </div>

        {/* Highest Priority Incidents Table */}
        <div className="bg-[#111726] border border-[#232f48] rounded-2xl p-4 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#232f48]">
            <h3 className="font-bold text-sm tracking-wide text-white uppercase">Top Triage Queue</h3>
            <span className="text-[10px] text-slate-400">Ranked by Priority Score</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[260px] pr-1">
            {stats?.top_critical_incidents?.length > 0 ? (
              stats.top_critical_incidents.map(inc => {
                let breakdown = null;
                try {
                  breakdown = typeof inc.score_breakdown === 'string' ? JSON.parse(inc.score_breakdown) : inc.score_breakdown;
                } catch(e) {}
                const explanation = breakdown?.explanation || `${inc.severity_level} priority based on emergency parameters.`;

                return (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className="p-2.5 rounded-lg bg-[#161f33] hover:bg-[#1c2742] border border-[#232f48] cursor-pointer transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-cyan-400">{inc.id}</span>
                      <SeverityBadge severity={inc.severity_level} score={inc.priority_score} />
                    </div>
                    <h4 className="text-xs font-semibold text-white truncate">{inc.title}</h4>
                    <p className="text-[11px] text-slate-300 line-clamp-1 italic border-l-2 border-cyan-500 pl-1.5">
                      {explanation}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                      <span>{inc.resource_type}: {inc.allocated_units}/{inc.resource_need}</span>
                      <StatusBadge status={inc.status} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">No active triage items.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 1B. INTERACTIVE OPENSTREETMAP LEAFLET MAP (NO API KEY REQUIRED)
// ==========================================
function InteractiveLeafletMap({ mapData, onResolve, onSelectIncident }) {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [mapTheme, setMapTheme] = useState('dark'); // 'dark' | 'standard'

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      // Initialize map centered at Delhi NCR coordination grid
      const map = L.map(mapContainerRef.current, {
        center: [28.6250, 77.2250],
        zoom: 12,
        zoomControl: true
      });

      // OpenStreetMap standard tile layer - 100% FREE, NO API KEY REQUIRED
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
        className: 'osm-dark-tiles'
      }).addTo(map);

      leafletMapRef.current = map;
    }

    const map = leafletMapRef.current;

    // Invalidate size to guarantee tile rendering on tab switch
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Clear previous markers & polylines
    map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    if (!mapData) return;

    // Severity Colors
    const sevColors = {
      Critical: '#ef4444',
      High: '#f97316',
      Medium: '#eab308',
      Low: '#10b981'
    };

    const allCoords = [];

    // Plot Incidents
    mapData.incidents?.forEach(inc => {
      const color = sevColors[inc.severity_level] || '#10b981';
      allCoords.push([inc.latitude, inc.longitude]);

      // Pulsing circle for Critical & High
      if (inc.severity_level === 'Critical' || inc.severity_level === 'High') {
        L.circle([inc.latitude, inc.longitude], {
          radius: inc.severity_level === 'Critical' ? 1200 : 700,
          color: color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 1.5,
          dashArray: '4, 4'
        }).addTo(map);
      }

      // Custom HTML Marker Pin
      const icon = L.divIcon({
        className: 'custom-incident-pin',
        html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 14px ${color}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: white;">!</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon }).addTo(map);

      let breakdown = null;
      try {
        breakdown = typeof inc.score_breakdown === 'string' ? JSON.parse(inc.score_breakdown) : inc.score_breakdown;
      } catch(e) {}
      const explanation = breakdown?.explanation || `${inc.severity_level} priority disaster site.`;

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; min-width: 240px; padding: 4px;">
          <div style="font-weight: bold; font-size: 13px; color: ${color}; margin-bottom: 2px;">
            [${inc.severity_level}] ${inc.title}
          </div>
          <div style="color: #94a3b8; font-size: 11px; margin-bottom: 6px;">📍 ${inc.location_name}</div>
          
          <div style="background: rgba(15,23,42,0.8); padding: 6px; border-radius: 6px; margin-bottom: 6px; font-size: 11px; color: #e2e8f0; border-left: 3px solid ${color};">
            <strong>Priority Reason:</strong><br/>
            ${explanation}
          </div>

          <div style="margin-bottom: 3px;"><strong>Priority Score:</strong> ${inc.priority_score.toFixed(3)}</div>
          <div style="margin-bottom: 3px;"><strong>Casualties:</strong> ${inc.injured_count} injured / ${inc.affected_count} affected</div>
          <div style="margin-bottom: 3px;"><strong>Resource Need:</strong> ${inc.resource_type} (${inc.allocated_units}/${inc.resource_need} units)</div>
          <div style="margin-bottom: 6px;"><strong>Status:</strong> ${inc.status}</div>
        </div>
      `;
      marker.bindPopup(popupContent);
    });

    // Plot Emergency Resources / Depots
    mapData.resources?.forEach(res => {
      const isAvailable = res.status === 'Available';
      const iconColor = isAvailable ? '#10b981' : '#3b82f6';
      allCoords.push([res.latitude, res.longitude]);

      const icon = L.divIcon({
        className: 'custom-resource-pin',
        html: `<div style="background-color: #111726; border: 2px solid ${iconColor}; width: 24px; height: 24px; border-radius: 6px; box-shadow: 0 0 10px ${iconColor}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: ${iconColor};">R</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([res.latitude, res.longitude], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-size: 12px; padding: 4px;">
          <strong style="color: ${iconColor}; font-size: 13px;">${res.name}</strong><br/>
          <span style="color: #94a3b8;">${res.resource_type} • Depot: ${res.base_station}</span><br/>
          Status: <strong>${res.status}</strong> (Capacity: ${res.capacity} units)<br/>
          ${res.assigned_incident_id ? `<span style="color: #38bdf8;">Assigned to: ${res.assigned_incident_id}</span>` : '<span style="color: #4ade80;">● Ready for Dispatch</span>'}
        </div>
      `);
    });

    // Draw Polyline Deployment Routes
    mapData.active_links?.forEach(link => {
      const latlngs = [
        [link.res_lat, link.res_lon],
        [link.inc_lat, link.inc_lon]
      ];

      L.polyline(latlngs, {
        color: '#06b6d4',
        weight: 3,
        opacity: 0.85,
        dashArray: '6, 6'
      }).addTo(map).bindTooltip(`
        <strong>${link.resource_type}</strong> dispatched to <strong>${link.inc_title}</strong><br/>
        Haversine Distance: <strong>${link.distance_km} km</strong>
      `, { sticky: true });
    });

    // Auto-fit map to coordinate bounds
    if (allCoords.length > 0) {
      try {
        map.fitBounds(allCoords, { padding: [40, 40], maxZoom: 13 });
      } catch(e) {}
    }

  }, [mapData]);

  // Toggle map theme between dark operations center and standard OSM
  const toggleMapTheme = () => {
    const newTheme = mapTheme === 'dark' ? 'standard' : 'dark';
    setMapTheme(newTheme);
    const container = mapContainerRef.current;
    if (container) {
      const tiles = container.querySelectorAll('.leaflet-tile');
      tiles.forEach(t => {
        if (newTheme === 'dark') {
          t.classList.add('osm-dark-tiles');
        } else {
          t.classList.remove('osm-dark-tiles');
        }
      });
    }
  };

  return (
    <div className="w-full h-full min-h-[380px] relative">
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />
      
      {/* Map Style Switcher (No API Key Required) */}
      <div className="absolute top-3 right-3 z-[1000]">
        <button
          onClick={toggleMapTheme}
          className="px-2.5 py-1 rounded bg-[#101522]/90 hover:bg-[#1c2742] text-[11px] font-bold text-cyan-300 border border-cyan-500/50 shadow-md backdrop-blur-sm transition-all"
        >
          {mapTheme === 'dark' ? '☀️ Standard OSM View' : '🌙 Dark Tactical View'}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 2. REPORT EMERGENCY FORM COMPONENT
// ==========================================
function ReportIncidentView({ submissionResult, setSubmissionResult, onSuccess, onGoDashboard, onGoIncidents }) {
  const [formData, setFormData] = useState({
    title: '',
    disaster_type: 'Building Collapse',
    location_name: 'Downtown Commercial Core',
    latitude: 28.6328,
    longitude: 77.2197,
    urgency: 4,
    affected_count: 250,
    injured_count: 30,
    resource_need: 3,
    resource_type: 'Rescue Team'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Real-time Priority Score preview computation
  const livePreview = useMemo(() => {
    const u_norm = (Number(formData.urgency) || 1) / 4.0;
    const i_norm = Math.min(1.0, (Number(formData.injured_count) || 0) / 50.0);
    const a_norm = Math.min(1.0, (Number(formData.affected_count) || 0) / 500.0);
    const r_norm = Math.min(1.0, (Number(formData.resource_need) || 1) / 20.0);

    const u_contrib = 0.40 * u_norm;
    const i_contrib = 0.25 * i_norm;
    const a_contrib = 0.20 * a_norm;
    const r_contrib = 0.15 * r_norm;

    const total = u_contrib + i_contrib + a_contrib + r_contrib;

    let sev = 'Low';
    if (total >= 0.65) sev = 'Critical';
    else if (total >= 0.45) sev = 'High';
    else if (total >= 0.25) sev = 'Medium';

    return {
      score: total,
      severity: sev,
      u_contrib,
      i_contrib,
      a_contrib,
      r_contrib
    };
  }, [formData]);

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Title is required';
    if (!formData.location_name.trim()) errs.location_name = 'Location landmark is required';
    if (formData.injured_count > formData.affected_count && formData.affected_count > 0) {
      errs.injured_count = 'Injured count cannot exceed total affected count';
    }
    if (formData.resource_need < 1) errs.resource_need = 'At least 1 unit required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await API.reportIncident({
        ...formData,
        urgency: Number(formData.urgency),
        affected_count: Number(formData.affected_count),
        injured_count: Number(formData.injured_count),
        resource_need: Number(formData.resource_need),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude)
      });
      setSubmissionResult(res);
      onSuccess(res);
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Post-Submission Success Confirmation Card */}
      {submissionResult && (
        <div className="bg-[#111726] border-2 border-emerald-500/60 rounded-2xl p-6 shadow-2xl space-y-4 animate-fade-in">
          <div className="flex items-start justify-between pb-3 border-b border-[#232f48]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/40">
                ✓
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-cyan-400">{submissionResult.id}</span>
                  <SeverityBadge severity={submissionResult.severity_level} score={submissionResult.priority_score} />
                  <StatusBadge status={submissionResult.status} />
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">{submissionResult.title}</h3>
              </div>
            </div>

            <button
              onClick={() => setSubmissionResult(null)}
              className="text-slate-400 hover:text-white font-mono text-sm"
            >
              ✕ Dismiss
            </button>
          </div>

          {/* Priority Explanation Callout */}
          <div className="p-4 rounded-xl bg-[#141b2d] border border-cyan-500/40 space-y-2">
            <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
              <Icons.Info />
              <span>Priority Decision & Transparent Explanation</span>
            </div>
            <p className="text-sm text-slate-100 font-medium">
              {submissionResult.score_breakdown?.explanation || "Incident prioritized using rule-based research formula."}
            </p>
            <div className="text-xs font-mono text-cyan-400/90 pt-1">
              {submissionResult.score_breakdown?.math_formula}
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                setSubmissionResult(null);
                setFormData({
                  title: '',
                  disaster_type: 'Building Collapse',
                  location_name: 'Downtown Commercial Core',
                  latitude: 28.6328,
                  longitude: 77.2197,
                  urgency: 4,
                  affected_count: 250,
                  injured_count: 30,
                  resource_need: 3,
                  resource_type: 'Rescue Team'
                });
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              + Report Another Emergency
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onGoIncidents}
                className="px-4 py-2 rounded-xl bg-[#1c2742] hover:bg-cyan-900/50 text-cyan-300 border border-[#2a3c63] text-xs font-bold"
              >
                View in Triage Matrix →
              </button>
              <button
                onClick={onGoDashboard}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg"
              >
                Go to Dashboard →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Intake Form */}
      <div className="bg-[#111726] border border-[#232f48] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#232f48]">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
                <Icons.Alert />
              </span>
              <span>Emergency Incident Intake Form</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Field reports are evaluated automatically using the PBL rule-based priority scoring model.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-cyan-400 block">AUTO DISPATCH</span>
            <span className="text-xs text-slate-400 font-mono">Greedy Engine Linked</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title & Disaster Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Incident Title / Summary *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Metro Tunnel Water Inflow & Trapped Passengers"
                className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Disaster Type *</label>
              <select
                value={formData.disaster_type}
                onChange={e => setFormData({ ...formData, disaster_type: e.target.value })}
                className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {DISASTER_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Presets & Coordinates */}
          <div className="space-y-3 p-4 bg-[#161f33]/60 border border-[#232f48] rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Icons.MapPin />
                <span>Geographic Location & Coordinates</span>
              </label>
              <span className="text-[11px] text-cyan-400 font-mono">Haversine Distance Target</span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-400 self-center mr-1">Presets:</span>
              {LOCATION_PRESETS.map((loc, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setFormData({
                    ...formData,
                    location_name: loc.name,
                    latitude: loc.lat,
                    longitude: loc.lon
                  })}
                  className="px-2.5 py-1 rounded bg-[#1f2b47] hover:bg-cyan-900/40 text-[11px] text-slate-300 hover:text-cyan-300 border border-[#2c3d63] transition-colors"
                >
                  {loc.name.split(' ')[0]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1 space-y-1">
                <label className="text-[11px] text-slate-400">Landmark / Area Name *</label>
                <input
                  type="text"
                  required
                  value={formData.location_name}
                  onChange={e => setFormData({ ...formData, location_name: e.target.value })}
                  className="w-full bg-[#111726] border border-[#283756] rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.latitude}
                  onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#111726] border border-[#283756] rounded-lg px-3 py-2 text-xs font-mono text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.longitude}
                  onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#111726] border border-[#283756] rounded-lg px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>
          </div>

          {/* Urgency 1 to 4 Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Urgency Level (1 – 4) *</span>
              <span className="text-cyan-400 text-xs font-mono">Weight: 40% (0.40)</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { level: 1, label: 'Level 1: Advisory', desc: 'No immediate threat to life', color: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/30' },
                { level: 2, label: 'Level 2: Moderate', desc: 'Contained threat, escalable', color: 'border-yellow-500/40 text-yellow-300 hover:bg-yellow-950/30' },
                { level: 3, label: 'Level 3: Severe', desc: 'Dangerous, injuries present', color: 'border-orange-500/40 text-orange-400 hover:bg-orange-950/30' },
                { level: 4, label: 'Level 4: Catastrophic', desc: 'Mass casualty / imminent peril', color: 'border-red-500/50 text-red-400 hover:bg-red-950/40' }
              ].map(u => (
                <button
                  type="button"
                  key={u.level}
                  onClick={() => setFormData({ ...formData, urgency: u.level })}
                  className={`p-3 rounded-xl border text-left transition-all ${u.color} ${
                    formData.urgency === u.level
                      ? 'bg-slate-800 ring-2 ring-cyan-400 shadow-lg'
                      : 'bg-[#161f33]'
                  }`}
                >
                  <div className="font-bold text-xs">{u.label}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{u.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantitative Impact & Resources */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">People Affected</label>
              <input
                type="number"
                min="0"
                value={formData.affected_count}
                onChange={e => setFormData({ ...formData, affected_count: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3.5 py-2.5 text-sm text-white"
              />
              <span className="text-[10px] text-slate-500">Weight: 20% (Cap: 500)</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">People Injured</label>
              <input
                type="number"
                min="0"
                value={formData.injured_count}
                onChange={e => setFormData({ ...formData, injured_count: parseInt(e.target.value) || 0 })}
                className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3.5 py-2.5 text-sm text-white"
              />
              {errors.injured_count ? (
                <span className="text-[10px] text-red-400 block">{errors.injured_count}</span>
              ) : (
                <span className="text-[10px] text-slate-500">Weight: 25% (Cap: 50)</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Units Demanded</label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.resource_need}
                onChange={e => setFormData({ ...formData, resource_need: parseInt(e.target.value) || 1 })}
                className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3.5 py-2.5 text-sm text-white"
              />
              <span className="text-[10px] text-slate-500">Weight: 15% (Cap: 20)</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Resource Type Needed</label>
              <select
                value={formData.resource_type}
                onChange={e => setFormData({ ...formData, resource_type: e.target.value })}
                className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3.5 py-2.5 text-sm text-white"
              >
                {RESOURCE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <span className="text-[10px] text-cyan-400 font-mono">Strict Type Match</span>
            </div>
          </div>

          {/* Live Dynamic Priority Score Preview Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#141b2d] to-[#1a233b] border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Live Rule-Based Priority Score Preview
                </span>
                <p className="text-[11px] text-slate-400">
                  Priority Score = (0.40 × Urgency) + (0.25 × Injured) + (0.20 × Affected) + (0.15 × Resource Need)
                </p>
              </div>
              <SeverityBadge severity={livePreview.severity} score={livePreview.score} />
            </div>

            {/* Component Progress Bars */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2">
              <div>
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Urgency (40%)</span>
                  <span className="font-mono text-cyan-400">+{livePreview.u_contrib.toFixed(3)}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-cyan-400" style={{ width: `${(livePreview.u_contrib / 0.40) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Injured (25%)</span>
                  <span className="font-mono text-red-400">+{livePreview.i_contrib.toFixed(3)}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-red-400" style={{ width: `${(livePreview.i_contrib / 0.25) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Affected (20%)</span>
                  <span className="font-mono text-yellow-300">+{livePreview.a_contrib.toFixed(3)}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{ width: `${(livePreview.a_contrib / 0.20) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Resources (15%)</span>
                  <span className="font-mono text-purple-400">+{livePreview.r_contrib.toFixed(3)}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-purple-400" style={{ width: `${(livePreview.r_contrib / 0.15) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm shadow-xl shadow-red-600/30 transition-all active:scale-95 flex items-center gap-2"
            >
              <Icons.Alert />
              <span>{isSubmitting ? 'DISPATCHING EMERGENCY...' : 'SUBMIT & ALLOCATE EMERGENCY'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 3. INCIDENTS & SCORING MATRIX COMPONENT
// ==========================================
function IncidentsView({ incidents, selectedIncident, onSelectIncident, onResolve, onDelete }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  const filteredIncidents = incidents.filter(inc => {
    if (filterSeverity !== 'ALL' && inc.severity_level !== filterSeverity) return false;
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'Waiting for Resources' && inc.status !== 'Waiting for Resources' && inc.status !== 'Pending') return false;
      if (filterStatus === 'Fully Allocated' && inc.status !== 'Fully Allocated' && inc.status !== 'Assigned') return false;
      if (filterStatus !== 'Waiting for Resources' && filterStatus !== 'Fully Allocated' && inc.status !== filterStatus) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = inc.title.toLowerCase().includes(q);
      const matchLoc = inc.location_name.toLowerCase().includes(q);
      const matchId = inc.id.toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filtering Header */}
      <div className="bg-[#111726] border border-[#232f48] rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by incident ID, title, or location..."
            className="w-full bg-[#161f33] border border-[#283756] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 mr-1 text-[11px]">Severity:</span>
          {['ALL', 'Critical', 'High', 'Medium', 'Low'].map(sev => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterSeverity === sev
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#161f33] text-slate-300 hover:bg-[#1e2a44]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 mr-1 text-[11px]">Status:</span>
          {['ALL', 'Waiting for Resources', 'Partially Satisfied', 'Fully Allocated', 'Resolved'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filterStatus === st
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-[#161f33] text-slate-300 hover:bg-[#1e2a44]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-[#111726] border border-[#232f48] rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161f33] text-slate-400 font-mono uppercase text-[11px] border-b border-[#232f48]">
              <tr>
                <th className="px-4 py-3.5">Incident ID</th>
                <th className="px-4 py-3.5">Title & Priority Reason</th>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5">Priority Score</th>
                <th className="px-4 py-3.5">Casualties</th>
                <th className="px-4 py-3.5">Resource Need</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2b42]">
              {filteredIncidents.length > 0 ? (
                filteredIncidents.map(inc => {
                  const percent = Math.min(100, Math.round((inc.allocated_units / inc.resource_need) * 100));
                  let breakdown = null;
                  try {
                    breakdown = typeof inc.score_breakdown === 'string' ? JSON.parse(inc.score_breakdown) : inc.score_breakdown;
                  } catch(e) {}
                  const explanation = breakdown?.explanation || `${inc.severity_level} priority incident.`;

                  return (
                    <tr key={inc.id} className="hover:bg-[#141d2f] transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-cyan-400 whitespace-nowrap">
                        {inc.id}
                        <div className="text-[10px] text-slate-500 font-normal">
                          {new Date(inc.reported_at).toLocaleTimeString()}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 max-w-sm">
                        <div className="font-semibold text-white text-sm">{inc.title}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="text-amber-400">{inc.disaster_type}</span>
                          <span>•</span>
                          <span className="truncate">{inc.location_name}</span>
                        </div>
                        {/* Clear Priority Explanation in table */}
                        <div className="mt-1.5 p-1.5 rounded bg-[#101726] border-l-2 border-cyan-500 text-[11px] text-slate-300 italic">
                          {explanation}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <SeverityBadge severity={inc.severity_level} score={inc.priority_score} />
                      </td>

                      <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-100">{inc.priority_score.toFixed(3)}</div>
                        <div className="text-[10px] text-slate-500">Urgency: {inc.urgency}/4</div>
                      </td>

                      <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                        <div className="text-red-400 font-bold">{inc.injured_count} injured</div>
                        <div className="text-slate-400 text-[11px]">{inc.affected_count} affected</div>
                      </td>

                      <td className="px-4 py-3.5 min-w-[150px]">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className="text-slate-300">{inc.resource_type}</span>
                          <span className={percent === 100 ? 'text-emerald-400 font-bold' : percent > 0 ? 'text-purple-300' : 'text-amber-400'}>
                            {inc.allocated_units} / {inc.resource_need}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${percent === 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-purple-500' : 'bg-amber-500'}`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={inc.status} />
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => onSelectIncident(inc)}
                          title="View mathematical score breakdown"
                          className="px-2.5 py-1 rounded bg-[#1c2742] hover:bg-cyan-900/50 text-cyan-300 border border-[#2a3c63] transition-colors"
                        >
                          Scoring Formula
                        </button>

                        {inc.status !== 'Resolved' && (
                          <button
                            onClick={() => onResolve(inc.id)}
                            title="Resolve and release resources"
                            className="px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 transition-colors"
                          >
                            Resolve
                          </button>
                        )}

                        <button
                          onClick={() => onDelete(inc.id)}
                          title="Remove incident"
                          className="px-2 py-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 transition-colors"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-500 text-sm">
                    No incidents match the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SCORING BREAKDOWN MODAL COMPONENT
// ==========================================
function ScoringBreakdownModal({ incident, onClose, onResolve }) {
  const breakdown = incident.score_breakdown || {};
  const explanation = breakdown.explanation || `${incident.severity_level} priority emergency.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#111726] border border-[#232f48] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#232f48]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-400">{incident.id}</span>
              <SeverityBadge severity={incident.severity_level} score={incident.priority_score} />
            </div>
            <h3 className="text-lg font-bold text-white mt-1">{incident.title}</h3>
            <p className="text-xs text-slate-400">{incident.location_name} • Reported: {new Date(incident.reported_at).toLocaleString()}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-lg font-mono"
          >
            ✕
          </button>
        </div>

        {/* Priority Explanation Callout Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/40 space-y-2">
          <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
            <Icons.Info />
            <span>Transparent Priority Explanation</span>
          </div>
          <p className="text-sm font-semibold text-white">
            {explanation}
          </p>
          <div className="p-2.5 bg-[#0b0f17] rounded-lg font-mono text-xs text-cyan-200 border border-cyan-900/60 text-center">
            {breakdown.math_formula || "Priority Score = (0.40 × Urgency) + (0.25 × Injured) + (0.20 × Affected) + (0.15 × Resource Need)"}
          </div>
        </div>

        {/* 4 Factor Component Breakdown Table */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Weight & Contribution Breakdown</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Urgency Factor */}
            <div className="p-3 rounded-xl bg-[#161f33] border border-[#283756] space-y-1">
              <div className="flex justify-between font-semibold text-slate-200">
                <span>1. Urgency Metric</span>
                <span className="text-cyan-400 font-mono">Weight: 40%</span>
              </div>
              <div className="text-slate-400 text-[11px]">
                Raw: Level {incident.urgency} of 4 • Norm: {(incident.urgency / 4.0).toFixed(3)}
              </div>
              <div className="pt-1 text-right font-mono font-bold text-cyan-300">
                +{(0.40 * (incident.urgency / 4.0)).toFixed(4)}
              </div>
            </div>

            {/* Injured Factor */}
            <div className="p-3 rounded-xl bg-[#161f33] border border-[#283756] space-y-1">
              <div className="flex justify-between font-semibold text-slate-200">
                <span>2. Casualties (Injured)</span>
                <span className="text-red-400 font-mono">Weight: 25%</span>
              </div>
              <div className="text-slate-400 text-[11px]">
                Raw: {incident.injured_count} • Norm: {Math.min(1.0, incident.injured_count / 50.0).toFixed(3)} (Cap: 50)
              </div>
              <div className="pt-1 text-right font-mono font-bold text-red-300">
                +{(0.25 * Math.min(1.0, incident.injured_count / 50.0)).toFixed(4)}
              </div>
            </div>

            {/* Affected Factor */}
            <div className="p-3 rounded-xl bg-[#161f33] border border-[#283756] space-y-1">
              <div className="flex justify-between font-semibold text-slate-200">
                <span>3. Affected Population</span>
                <span className="text-yellow-400 font-mono">Weight: 20%</span>
              </div>
              <div className="text-slate-400 text-[11px]">
                Raw: {incident.affected_count} • Norm: {Math.min(1.0, incident.affected_count / 500.0).toFixed(3)} (Cap: 500)
              </div>
              <div className="pt-1 text-right font-mono font-bold text-yellow-300">
                +{(0.20 * Math.min(1.0, incident.affected_count / 500.0)).toFixed(4)}
              </div>
            </div>

            {/* Resource Need Factor */}
            <div className="p-3 rounded-xl bg-[#161f33] border border-[#283756] space-y-1">
              <div className="flex justify-between font-semibold text-slate-200">
                <span>4. Resource Demand</span>
                <span className="text-purple-400 font-mono">Weight: 15%</span>
              </div>
              <div className="text-slate-400 text-[11px]">
                Raw: {incident.resource_need} units • Norm: {Math.min(1.0, incident.resource_need / 20.0).toFixed(3)} (Cap: 20)
              </div>
              <div className="pt-1 text-right font-mono font-bold text-purple-300">
                +{(0.15 * Math.min(1.0, incident.resource_need / 20.0)).toFixed(4)}
              </div>
            </div>
          </div>
        </div>

        {/* Severity Threshold Reference Legend */}
        <div className="p-3 rounded-xl bg-[#141b2d] border border-[#232f48] space-y-2">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Severity Thresholds</div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
              <div className="font-bold">Low</div>
              <div className="text-[10px] font-mono">&lt; 0.25</div>
            </div>
            <div className="p-2 rounded bg-yellow-950/40 border border-yellow-500/30 text-yellow-300">
              <div className="font-bold">Medium</div>
              <div className="text-[10px] font-mono">≥ 0.25</div>
            </div>
            <div className="p-2 rounded bg-orange-950/40 border border-orange-500/30 text-orange-300">
              <div className="font-bold">High</div>
              <div className="text-[10px] font-mono">≥ 0.45</div>
            </div>
            <div className="p-2 rounded bg-red-950/40 border border-red-500/40 text-red-300">
              <div className="font-bold">Critical</div>
              <div className="text-[10px] font-mono">≥ 0.65</div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2">
          {incident.status !== 'Resolved' ? (
            <button
              onClick={() => {
                onResolve(incident.id);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
            >
              Mark Incident Resolved
            </button>
          ) : (
            <span className="text-xs text-slate-500 font-mono">Incident Resolved</span>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. LIVE RESOURCE MANAGEMENT COMPONENT
// ==========================================
function ResourcesView({ resources, onRefresh, onRelease, addToast }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredResources = resources.filter(res => {
    if (filterType !== 'ALL' && res.resource_type !== filterType) return false;
    if (filterStatus !== 'ALL' && res.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Fleet Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111726] border border-[#232f48] rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 mr-1 text-[11px]">Type:</span>
          {['ALL', ...RESOURCE_TYPES].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                filterType === type
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#161f33] text-slate-300 hover:bg-[#1e2a44]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px]">Status:</span>
            {['ALL', 'Available', 'Deployed'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  filterStatus === st
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#161f33] text-slate-300 hover:bg-[#1e2a44]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
          >
            <Icons.Plus />
            <span>ADD NEW RESOURCE</span>
          </button>
        </div>
      </div>

      {/* Resource Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.length > 0 ? (
          filteredResources.map(res => {
            const isAvail = res.status === 'Available';
            return (
              <div
                key={res.id}
                className="bg-[#111726] border border-[#232f48] hover:border-cyan-500/40 rounded-xl p-4 shadow-lg transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-cyan-400">{res.id}</span>
                      <h4 className="text-sm font-bold text-white mt-0.5">{res.name}</h4>
                    </div>
                    <StatusBadge status={res.status} />
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Resource Category:</span>
                      <span className="font-medium text-amber-300">{res.resource_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Base Depot:</span>
                      <span className="font-medium text-slate-200 truncate max-w-[180px]">{res.base_station}</span>
                    </div>
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-500">Coordinates:</span>
                      <span className="text-slate-400">{res.latitude.toFixed(4)}, {res.longitude.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-500">Capacity Units:</span>
                      <span className="font-bold text-white">{res.capacity} units</span>
                    </div>
                  </div>
                </div>

                {/* Assignment & Action */}
                <div className="pt-3 border-t border-[#1f2b42] flex items-center justify-between">
                  {res.assigned_incident_id ? (
                    <div className="text-[11px] text-cyan-300 font-mono">
                      Assigned to: <strong className="text-white">{res.assigned_incident_id}</strong>
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-400 font-mono">
                      ● Unassigned / Ready
                    </div>
                  )}

                  {!isAvail ? (
                    <button
                      onClick={() => onRelease(res.id)}
                      className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-600/40 text-xs font-medium transition-colors"
                    >
                      Release to Fleet
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">Idle at Depot</span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12 text-slate-500 text-sm">
            No resources match the selected criteria.
          </div>
        )}
      </div>

      {/* Add Resource Modal */}
      {showAddModal && (
        <AddResourceModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onRefresh();
            addToast("New emergency resource commissioned into inventory", "success");
          }}
        />
      )}
    </div>
  );
}

// Add Resource Modal Dialog
function AddResourceModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: 'Rapid EMT Ambulance Unit 4',
    resource_type: 'Ambulance',
    base_station: 'Central Trauma Hospital Depot',
    latitude: 28.6280,
    longitude: 77.2150,
    capacity: 1,
    status: 'Available'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await API.addResource({
        ...formData,
        capacity: Number(formData.capacity),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude)
      });
      onSuccess();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#111726] border border-[#232f48] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#232f48]">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Icons.Plus />
            <span>Commission New Emergency Resource</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-mono">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Resource Name / Call-Sign *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Resource Type *</label>
              <select
                value={formData.resource_type}
                onChange={e => setFormData({ ...formData, resource_type: e.target.value })}
                className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3 py-2 text-white"
              >
                {RESOURCE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Capacity Units *</label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.capacity}
                onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Base Depot Station *</label>
            <input
              type="text"
              required
              value={formData.base_station}
              onChange={e => setFormData({ ...formData, base_station: e.target.value })}
              className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.latitude}
                onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={formData.longitude}
                onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#232f48] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
            >
              {isSubmitting ? 'Adding...' : 'Commission Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 5. ALLOCATION ENGINE & AUDIT LOGS COMPONENT
// ==========================================
function AllocationEngineView({ stats, allocations, auditLogs, onRunAllocation, isAllocating, onReleaseResource }) {
  return (
    <div className="space-y-6">
      {/* Greedy Multi-Tier Allocation Algorithm Walkthrough Card */}
      <div className="bg-[#111726] border border-[#232f48] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#232f48]">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                <Icons.Layers />
              </span>
              <span>Priority-Based Greedy Resource Allocation Algorithm</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Multi-tier priority dispatcher matching critical incidents to nearest emergency resources via Haversine geometry.
            </p>
          </div>

          <button
            onClick={onRunAllocation}
            disabled={isAllocating}
            className={`px-6 py-3 rounded-xl font-bold text-sm tracking-wide shadow-xl flex items-center gap-2 transition-all active:scale-95 ${
              isAllocating
                ? 'bg-cyan-900 text-cyan-300 cursor-wait'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/30'
            }`}
          >
            <Icons.Play />
            <span>{isAllocating ? 'PROCESSING DISPATCH...' : 'TRIGGER ALLOCATION ENGINE'}</span>
          </button>
        </div>

        {/* 6 Step Interactive Architecture Process Diagram */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          {[
            { step: '1', title: 'Severity Rank', desc: 'Critical > High > Medium > Low' },
            { step: '2', title: 'Score Rank', desc: 'Higher Priority Score first' },
            { step: '3', title: 'FIFO Tie-Breaker', desc: 'Earliest reported timestamp' },
            { step: '4', title: 'Type Matching', desc: 'Strict resource type compatibility' },
            { step: '5', title: 'Haversine Proximity', desc: 'Nearest depot via great-circle dist' },
            { step: '6', title: 'State Transition', desc: 'Fully, Partially, or Waiting' }
          ].map((item) => (
            <div key={item.step} className="p-3 rounded-xl bg-[#161f33] border border-[#283756] relative">
              <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                {item.step}
              </span>
              <div className="font-bold text-slate-200 mt-1">{item.title}</div>
              <div className="text-[11px] text-slate-400 mt-1">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Shortage Warnings Banner if Partially Satisfied Incidents exist */}
      {stats?.partially_satisfied_count > 0 && (
        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-purple-400 animate-ping"></span>
            <div>
              <div className="text-xs font-bold text-purple-200 uppercase">Emergency Resource Shortage Flagged</div>
              <p className="text-xs text-purple-300">
                {stats.partially_satisfied_count} incident(s) are partially satisfied due to inventory depletion. Commission new resources to auto-fulfill demand.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-purple-300 px-3 py-1 rounded bg-purple-900/60 border border-purple-500/50">
            AUTO DISPATCH ACTIVE
          </span>
        </div>
      )}

      {/* Active Allocations Table */}
      <div className="bg-[#111726] border border-[#232f48] rounded-2xl shadow-xl overflow-hidden space-y-4 p-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Active Resource Dispatch Table</h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161f33] text-slate-400 font-mono uppercase text-[11px] border-b border-[#232f48]">
              <tr>
                <th className="px-4 py-3">Alloc ID</th>
                <th className="px-4 py-3">Incident ID</th>
                <th className="px-4 py-3">Assigned Resource</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Dispatched Units</th>
                <th className="px-4 py-3">Haversine Distance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2b42]">
              {allocations.filter(a => a.status === 'Active').length > 0 ? (
                allocations.filter(a => a.status === 'Active').map(alloc => (
                  <tr key={alloc.id} className="hover:bg-[#141d2f]">
                    <td className="px-4 py-3 font-mono text-slate-400">#{alloc.id}</td>
                    <td className="px-4 py-3 font-mono font-bold text-cyan-400">{alloc.incident_id}</td>
                    <td className="px-4 py-3 font-semibold text-white">{alloc.resource_id}</td>
                    <td className="px-4 py-3 text-amber-300">{alloc.resource_type}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-200">{alloc.units_allocated} unit(s)</td>
                    <td className="px-4 py-3 font-mono text-cyan-300">{alloc.distance_km.toFixed(2)} km</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={alloc.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onReleaseResource(alloc.resource_id)}
                        className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-600/40 text-[11px]"
                      >
                        Release Unit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-500">
                    No active dispatches. Run the allocation engine above to deploy resources.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Telemetry History */}
      <div className="bg-[#111726] border border-[#232f48] rounded-2xl shadow-xl p-4 space-y-3">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
          <span>Allocation Engine Telemetry & Audit Logs</span>
          <span className="text-[11px] font-mono text-slate-400 font-normal">Last 40 events</span>
        </h4>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {auditLogs && auditLogs.map(log => (
            <div key={log.id} className="p-2.5 rounded-lg bg-[#161f33] border border-[#232f48] text-xs flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10px] text-cyan-400 font-bold">{log.event_type}</span>
                  {log.incident_id && (
                    <span className="text-[10px] text-amber-400 font-mono bg-amber-950/40 px-1 rounded">
                      {log.incident_id}
                    </span>
                  )}
                </div>
                <p className="text-slate-200">{log.message}</p>
              </div>
              <div className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                {new Date(log.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. RANDOM FOREST AI MODULE (FUTURE ENHANCEMENT)
// ==========================================
function AiPredictionView({ addToast }) {
  const [aiInfo, setAiInfo] = useState(null);
  const [testForm, setTestForm] = useState({
    disaster_type: 'Flood',
    urgency: 4,
    injured: 35,
    affected: 300,
    resource_need: 5,
    weather_condition: 'Storm',
    infrastructure_damage: 'Severe'
  });

  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    API.getAiInfo().then(data => setAiInfo(data)).catch(console.error);
    handleSimulate();
  }, []);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await API.simulateAi(testForm);
      setSimulationResult(res);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Educational & Architectural Overview Banner */}
      <div className="bg-gradient-to-r from-[#111726] to-[#1c1a33] border border-indigo-500/40 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
            <Icons.Cpu />
          </span>
          <h3 className="text-lg font-bold text-white tracking-wide">
            Random Forest Severity Prediction – Future Enhancement
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {aiInfo?.purpose || "This section details the proposed future machine learning extension for the Cloud-Based Disaster Response Coordination Platform. Rather than replacing the explainable rule-based scoring formula, the Random Forest model will serve as an automated second-opinion classifier trained on historical multi-agency incident logs."}
        </p>
        <div className="text-[11px] text-indigo-300/90 font-mono bg-indigo-950/40 p-2 rounded-lg border border-indigo-500/30">
          ℹ️ Architecture Blueprint & Prototype Specification: Real-world model training will interface with certified national disaster registries (e.g. NDMA / FEMA historical incident datasets) once longitudinal data collection is verified.
        </div>
      </div>

      {/* Input Features & Output Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Features Vector */}
        <div className="bg-[#111726] border border-[#232f48] rounded-2xl p-5 shadow-xl space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-[#232f48] flex items-center justify-between">
            <span>Proposed Input Feature Vector</span>
            <span className="text-[10px] font-mono text-cyan-400">8 MULTI-VARIATE TELEMETRIES</span>
          </h4>

          <div className="space-y-2 text-xs">
            {aiInfo?.input_features?.map((feat, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-[#161f33] border border-[#283756] flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-cyan-300">{feat.name}</span>
                  <p className="text-[11px] text-slate-400">{feat.description}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {feat.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Possible Output Classes & Model Specs */}
        <div className="bg-[#111726] border border-[#232f48] rounded-2xl p-5 shadow-xl space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-[#232f48] flex items-center justify-between">
            <span>Possible Output Severity Classes</span>
            <span className="text-[10px] font-mono text-emerald-400">4 TRIAGE TIERS</span>
          </h4>

          <div className="space-y-2.5 text-xs">
            {aiInfo?.output_classes?.map((cls, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-[#161f33] border border-[#283756] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${cls.class_name === 'Critical' ? 'bg-red-400' : cls.class_name === 'High' ? 'bg-orange-400' : cls.class_name === 'Medium' ? 'bg-yellow-400' : 'bg-emerald-400'}`}></span>
                  <span className="font-bold text-white">{cls.class_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-300 block">{cls.action}</span>
                  <span className="text-[10px] font-mono text-slate-500">{cls.threshold_equivalent}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-[#141b2d] border border-[#232f48] text-xs space-y-1">
            <div className="font-bold text-slate-200">Ensemble Specification:</div>
            <div className="text-slate-400 text-[11px]">
              RandomForestClassifier (100–300 trees) with bootstrapping and Gini splitting. Aggregates soft voting probabilities to prevent high-leverage misclassifications during chaotic disaster events.
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Prototype Simulator */}
      <div className="bg-[#111726] border border-[#232f48] rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#232f48]">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Future Model Prototype Simulator & Side-by-Side Comparison
          </h4>
          <span className="text-xs text-cyan-400 font-mono">Architectural Sandbox</span>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-400">Disaster Type</label>
            <select
              value={testForm.disaster_type}
              onChange={e => setTestForm({ ...testForm, disaster_type: e.target.value })}
              className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3 py-2 text-white"
            >
              {DISASTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400">Urgency Level (1 – 4)</label>
            <select
              value={testForm.urgency}
              onChange={e => setTestForm({ ...testForm, urgency: parseInt(e.target.value) })}
              className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3 py-2 text-white"
            >
              <option value="1">Level 1: Advisory</option>
              <option value="2">Level 2: Moderate</option>
              <option value="3">Level 3: Severe</option>
              <option value="4">Level 4: Catastrophic</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400">Injured Casualties</label>
            <input
              type="number"
              min="0"
              value={testForm.injured}
              onChange={e => setTestForm({ ...testForm, injured: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400">Affected Population</label>
            <input
              type="number"
              min="0"
              value={testForm.affected}
              onChange={e => setTestForm({ ...testForm, affected: parseInt(e.target.value) || 0 })}
              className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400">Resource Need Units</label>
            <input
              type="number"
              min="1"
              value={testForm.resource_need}
              onChange={e => setTestForm({ ...testForm, resource_need: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400">Weather Condition</label>
            <select
              value={testForm.weather_condition}
              onChange={e => setTestForm({ ...testForm, weather_condition: e.target.value })}
              className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3 py-2 text-white"
            >
              <option value="Clear">Clear</option>
              <option value="Rain">Rain</option>
              <option value="Storm">Severe Storm</option>
              <option value="Extreme Wind">Extreme Wind</option>
              <option value="Fog">Dense Fog</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-400">Infrastructure Damage</label>
            <select
              value={testForm.infrastructure_damage}
              onChange={e => setTestForm({ ...testForm, infrastructure_damage: e.target.value })}
              className="w-full bg-[#161f33] border border-[#283756] rounded-lg px-3 py-2 text-white"
            >
              <option value="Minor">Minor</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
              <option value="Catastrophic">Catastrophic</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md"
            >
              {isSimulating ? 'Simulating...' : 'Simulate Scenario'}
            </button>
          </div>
        </div>

        {/* Comparison Result Cards */}
        {simulationResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#232f48]">
            {/* Left: Rule-Based Scoring */}
            <div className="p-4 rounded-xl bg-[#141b2d] border border-cyan-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 uppercase">
                  1. Current Rule-Based Scoring
                </span>
                <SeverityBadge
                  severity={simulationResult.rule_based_ground_truth.severity_level}
                  score={simulationResult.rule_based_ground_truth.priority_score}
                />
              </div>

              <div className="text-xs text-slate-300">
                Formula Score: <strong className="font-mono text-cyan-400">{simulationResult.rule_based_ground_truth.priority_score.toFixed(4)}</strong>
              </div>

              <p className="text-[11px] text-slate-300 italic border-l-2 border-cyan-400 pl-2">
                {simulationResult.rule_based_ground_truth.explanation}
              </p>
            </div>

            {/* Right: Random Forest Future Model */}
            <div className="p-4 rounded-xl bg-[#1a1730] border border-indigo-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 uppercase">
                  2. Future Random Forest Simulation
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/50">
                  {simulationResult.future_rf_classification.predicted_severity}
                </span>
              </div>

              {/* Class Probabilities Distribution */}
              <div className="space-y-1.5 pt-1 text-xs">
                {Object.entries(simulationResult.future_rf_classification.class_probabilities).map(([cls, prob]) => (
                  <div key={cls} className="flex items-center gap-2 text-[11px]">
                    <span className="w-16 font-semibold text-slate-300">{cls}:</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${cls === 'Critical' ? 'bg-red-400' : cls === 'High' ? 'bg-orange-400' : cls === 'Medium' ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                        style={{ width: `${prob * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-mono text-slate-400 w-12 text-right">{(prob * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Comparative Notes */}
        {simulationResult?.comparative_analysis && (
          <div className="p-3 rounded-lg bg-[#161f33] border border-[#232f48] text-xs text-slate-300 flex items-center gap-2">
            <Icons.Info />
            <span>{simulationResult.comparative_analysis}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 8. COLLEGE PRESENTATION DEMO SCENARIO MODAL
// ==========================================
function DemoScenarioModal({ onClose, onRefreshAll, onNavigate, addToast }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepData, setStepData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    { num: 1, title: "1. Baseline Setup", desc: "Reset and inspect existing emergency fleet and incidents." },
    { num: 2, title: "2. Emergency Intake", desc: "Report critical Metro Tunnel collapse needing 2 Rescue Teams." },
    { num: 3, title: "3. Priority Scoring", desc: "Calculate Priority Score (0.785) & explain why it is Critical." },
    { num: 4, title: "4. Multi-Tier Ranking", desc: "Rank queue: Critical incident moves to Rank #1 ahead of Medium/Low." },
    { num: 5, title: "5. Nearest Resource", desc: "Find nearest available Rescue Team via Haversine geometry (2.4 km)." },
    { num: 6, title: "6. Shortage Handling", desc: "Deploy available unit; flag 'Partially Satisfied' (1/2 shortage)." },
    { num: 7, title: "7. Resolve Incident", desc: "Resolve older incident to free deployed Rescue Team Bravo." },
    { num: 8, title: "8. Auto-Reallocation", desc: "Freed unit auto-redeploys to Metro Tunnel -> 'Fully Allocated'!" }
  ];

  const runStep = async (stepNum) => {
    setIsLoading(true);
    try {
      if (stepNum === 1) {
        const res = await API.demoReset();
        setStepData(res);
        addToast("Demo baseline scenario loaded", "info");
      } else {
        const res = await API.demoStep(stepNum);
        setStepData(res);
        addToast(res.title || `Demo Step ${stepNum} executed`, "success");
      }
      setCurrentStep(stepNum);
      await onRefreshAll();
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#111726] border-2 border-cyan-500/50 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232f48]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xl">
              <Icons.GraduationCap />
            </span>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                College PBL Presentation Demo Scenario
              </h3>
              <p className="text-xs text-slate-400">
                Guided 8-step presentation workflow demonstrating the end-to-end disaster coordination lifecycle.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-mono text-base">✕</button>
        </div>

        {/* Step Progression Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {steps.map(s => (
            <button
              key={s.num}
              onClick={() => runStep(s.num)}
              disabled={isLoading}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                currentStep === s.num
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/30'
                  : currentStep > s.num
                  ? 'bg-[#161f33] border-emerald-500/40 text-emerald-300'
                  : 'bg-[#141b2d] border-[#232f48] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>{s.title}</span>
                {currentStep > s.num && <span className="text-emerald-400">✓</span>}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{s.desc}</div>
            </button>
          ))}
        </div>

        {/* Step Details & Examiner Talking Points */}
        <div className="p-5 rounded-2xl bg-[#161f33] border border-[#232f48] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-400">
              ACTIVE STAGE: STEP {currentStep} OF 8
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40">
              LIVE DATABASE CONNECTED
            </span>
          </div>

          <div>
            <h4 className="text-base font-bold text-white">
              {steps[currentStep - 1].title}
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {stepData?.explanation || steps[currentStep - 1].desc}
            </p>
          </div>

          {/* Examiner Presentation Talking Point Box */}
          <div className="p-3.5 rounded-xl bg-[#0e1424] border-l-4 border-cyan-400 text-xs text-slate-200 space-y-1">
            <span className="font-bold text-cyan-300 block uppercase tracking-wider text-[10px]">
              🎤 What to highlight to the Examiners:
            </span>
            {currentStep === 1 && (
              <p className="text-[11px] text-slate-300">
                "Here we demonstrate our baseline operations center. Emergency resources are distributed across regional depots with GPS coordinates, and existing High and Medium priority incidents are in progress."
              </p>
            )}
            {(currentStep === 2 || currentStep === 3) && (
              <p className="text-[11px] text-slate-300">
                "A catastrophic collapse is reported. Notice how our rule-based scoring engine weights 40% Urgency (Level 4), 25% Casualties (38 injured), 20% Affected, and 15% Resource need to compute a score of 0.785, categorizing it as Critical and providing a fully transparent explanation."
              </p>
            )}
            {(currentStep === 4 || currentStep === 5) && (
              <p className="text-[11px] text-slate-300">
                "The greedy dispatcher ranks incidents by Severity Level first, using priority score as secondary factor. It uses the Haversine formula to compute great-circle distance and selects the nearest depot (USAR Alpha, 2.4 km away)."
              </p>
            )}
            {currentStep === 6 && (
              <p className="text-[11px] text-slate-300">
                "Notice shortage handling: The incident demanded 2 units, but only 1 was available in inventory. The system allocates the 1 unit and flags the incident as 'Partially Satisfied' rather than failing."
              </p>
            )}
            {(currentStep === 7 || currentStep === 8) && (
              <p className="text-[11px] text-slate-300">
                "When an incident is marked Resolved, its resources are released back to Available. The system automatically re-evaluates all waiting and partially satisfied incidents, immediately dispatching the newly freed team to satisfy the shortage, turning it to 'Fully Allocated'!"
              </p>
            )}
          </div>

          {stepData?.action_taken && (
            <div className="text-xs font-mono text-emerald-400 bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-500/30">
              ⚡ Action Executed: {stepData.action_taken}
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => runStep(1)}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            ↺ Reset Demo
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 rounded-xl bg-[#1c2742] hover:bg-cyan-900/40 text-cyan-300 border border-[#2a3c63] text-xs font-bold"
            >
              View on Dashboard →
            </button>

            {currentStep < 8 ? (
              <button
                onClick={() => runStep(currentStep + 1)}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg"
              >
                {isLoading ? 'Executing...' : `Execute Step ${currentStep + 1} →`}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg"
              >
                Complete Presentation ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mount React Root
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
