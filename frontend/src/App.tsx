import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import { CommandCenter } from './pages/CommandCenter';
import { OperationsPage } from './pages/OperationsPage';
import { UnitPassportPage } from './pages/UnitPassportPage';
import { ExceptionsPage } from './pages/ExceptionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import Evaluation from './pages/Evaluation';
import SettingsPage from './pages/SettingsPage';
import { ApiError, applyOverride, createUnit, fetchHealth, fetchWorkflowBundle, fetchWorkflows, probeBackend, runStageInspection, runWorkflow } from './services/api';
import type { WorkflowState, EvidenceRecord, StageName } from './types';

import { DEMO_WORKFLOWS, DEMO_EVIDENCE } from './data/demoData';
import { RefreshCw, PlusCircle, Search, Bell, ChevronRight, LayoutGrid, Menu, X } from 'lucide-react';
import { NewUnitModal } from './components/NewUnitModal';
import { LandingPage } from './pages/LandingPage';

type Page =
  | 'landing'
  | 'command-center'
  | 'passport'
  | 'exceptions'
  | 'receiving'
  | 'prep'
  | 'pack'
  | 'returns'
  | 'recovery'
  | 'analytics'
  | 'settings';

const PAGE_LABELS: Record<string, string> = {
  'command-center': 'Command Center',
  passport:         'Unit Passports',
  exceptions:       'Review Queue',
  receiving:        'Receiving',
  prep:             'Prep',
  pack:             'Pack',
  returns:          'Returns',
  recovery:         'Recovery',
  analytics:        'Claims & Analytics',
  settings:         'System Health',
};

export default function App() {
  const [page, setPage] = useState<Page>('landing');
  const [pageParams, setPageParams] = useState<Record<string, string>>({});
  const [org, setOrg] = useState('org_demo_alpha');
  const [workflows, setWorkflows] = useState<WorkflowState[]>(() => Object.values(DEMO_WORKFLOWS));
  const [evidence, setEvidence] = useState<Record<string, EvidenceRecord>>(DEMO_EVIDENCE);
  const [selectedUnit, setSelectedUnit] = useState<string>('UNIT-0014');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [agentHealth, setAgentHealth] = useState<Record<string, { status: string }>>({});
  const [actionError, setActionError] = useState('');
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [liveBackend, setLiveBackend] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('cube-theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('cube-theme', theme);
  }, [theme]);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const backendUp = await probeBackend();
      setLiveBackend(backendUp);
      const [liveWfs, health] = await Promise.all([fetchWorkflows(org), fetchHealth()]);
      const tenantWorkflows = liveWfs.filter((workflow) => workflow.org_id === org);
      if (tenantWorkflows.length > 0) {
        setWorkflows(tenantWorkflows);
      } else if (!backendUp && import.meta.env.VITE_ALLOW_DEMO_FALLBACK === '1') {
        setWorkflows(Object.values(DEMO_WORKFLOWS).filter((workflow) => workflow.org_id === org));
      } else {
        setWorkflows(tenantWorkflows);
      }
      setAgentHealth(health.agents);
      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [org]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const navigate = (newPage: string, params?: Record<string, string>) => {
    window.scrollTo(0, 0);
    setPage(newPage as Page);
    if (params?.unitId) setSelectedUnit(params.unitId);
    setPageParams(params || {});
  };

  const handleRunWorkflow = async (unitId: string) => {
    try {
      setActionError('');
      let updatedWf: WorkflowState;
      try {
        updatedWf = await runWorkflow(unitId, org);
      } catch (error) {
        const demo = DEMO_WORKFLOWS[unitId];
        if (!(error instanceof ApiError) || error.status !== 404 || !demo || demo.org_id !== org) throw error;
        const receivingEvidence = Object.values(DEMO_EVIDENCE).find(
          (record) => record.stage === 'receiving' && record.subject.subject_id === unitId && record.subject.org_id === org,
        );
        await createUnit({
          unit_id: unitId,
          org_id: org,
          route: demo.stage_results.find((item) => item.stage === 'prep')?.state === 'skipped' ? 'mfn' : 'fba',
          returned: demo.stage_results.find((item) => item.stage === 'returns')?.state !== 'skipped',
          sku: receivingEvidence?.subject.refs?.sku?.toString() || 'SKU-DEMO',
          expected_qty: Number(receivingEvidence?.payload.qty_ordered || 1),
        });
        updatedWf = await runWorkflow(unitId, org);
      }
      setWorkflows((prev) => [updatedWf, ...prev.filter((workflow) => workflow.subject_id !== unitId)]);
      const bundle = await fetchWorkflowBundle(unitId, org);
      setEvidence((prev) => ({ ...prev, ...bundle.evidence }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : `Could not run workflow for ${unitId}.`);
    }
  };

  const handleApplyOverride = async (unitId: string, recordId: string, verdict: string, actor: string, reason: string) => {
    try {
      setActionError('');
      const updatedWf = await applyOverride(unitId, recordId, verdict, actor, reason, org);
      setWorkflows((prev) => [updatedWf, ...prev.filter((workflow) => workflow.subject_id !== unitId)]);
      await loadData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save the review override.');
    }
  };

  const handleRunInspection = async (unitId: string, stage: StageName, payload: any) => {
    const workflow = workflows.find((item) => item.subject_id === unitId);
    const route = workflow?.stage_results.find((item) => item.stage === 'prep')?.state === 'skipped' ? 'mfn' : 'fba';
    const returned = workflow?.stage_results.find((item) => item.stage === 'returns')?.state !== 'skipped';
    setActionError('');
    try {
      const result = await runStageInspection(unitId, stage, payload, org, route, returned);
      setWorkflows((prev) => [result.workflow, ...prev.filter((item) => item.subject_id !== unitId)]);
      setEvidence((prev) => ({ ...prev, [result.evidence.record_id]: result.evidence }));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : `${stage} inspection failed.`;
      setActionError(message);
      throw new Error(message);
    }
  };

  const handleCreateUnit = async (
    unitId: string,
    route: string,
    returned: boolean,
    sku: string,
    expectedQty: number,
    variant: string,
    fnsku: string,
    orderId: string,
  ) => {
    const workflow = await createUnit({
      unit_id: unitId.trim(),
      org_id: org,
      route,
      returned,
      sku: sku.trim(),
      expected_qty: expectedQty,
      variant,
      fnsku,
      order_id: orderId,
    });
    setWorkflows((prev) => [workflow, ...prev.filter((item) => item.subject_id !== unitId)]);
    setSelectedUnit(unitId);
    setShowNewUnit(false);
    navigate('receiving', { unitId });
  };

  const exceptionsCount = workflows.filter((w) => w.status === 'HALTED' || w.status === 'DEGRADED').length;

  const renderPage = () => {
    switch (page) {
      case 'command-center':
        return (
          <CommandCenter
            orgId={org}
            workflows={workflows}
            liveBackend={liveBackend}
            lastRefresh={lastRefresh}
            isRefreshing={isRefreshing}
            onRefresh={loadData}
            theme={theme}
            onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            onSelectUnit={(uid) => navigate('passport', { unitId: uid })}
            onNavigateAgent={(stage) => navigate(stage)}
            onRunWorkflow={handleRunWorkflow}
            onOpenNewUnitModal={() => setShowNewUnit(true)}
          />
        );
      case 'passport':
        return (
          <UnitPassportPage
            unitId={selectedUnit || pageParams.unitId || 'UNIT-0014'}
            workflows={workflows}
            evidence={evidence}
          />
        );
      case 'exceptions':
        return (
          <ExceptionsPage
            workflows={workflows}
            onApplyOverride={handleApplyOverride}
          />
        );
      case 'receiving':
      case 'prep':
      case 'pack':
      case 'returns':
      case 'recovery':
        return (
          <OperationsPage
            workflows={workflows}
            evidence={evidence}
            orgId={org}
            agentHealth={agentHealth}
            initialStage={page as StageName}
            initialUnitId={selectedUnit}
            onSelectStage={(stage) => navigate(stage)}
            onSelectUnit={setSelectedUnit}
            onOpenPassport={(uid) => navigate('passport', { unitId: uid })}
            onRunInspection={handleRunInspection}
          />
        );
      case 'analytics':
        return (
          <div className="space-y-6">
            <AnalyticsPage
              workflows={workflows}
              demoMode={!liveBackend}
              demoWorkflows={Object.values(DEMO_WORKFLOWS).filter((workflow) => workflow.org_id === org)}
            />
            <Evaluation org={org} />
          </div>
        );
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <CommandCenter
            orgId={org}
            workflows={workflows}
            liveBackend={liveBackend}
            lastRefresh={lastRefresh}
            isRefreshing={isRefreshing}
            onRefresh={loadData}
            theme={theme}
            onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            onSelectUnit={(uid) => navigate('passport', { unitId: uid })}
            onNavigateAgent={(stage) => navigate(stage)}
            onRunWorkflow={handleRunWorkflow}
            onOpenNewUnitModal={() => setShowNewUnit(true)}
          />
        );
    }
  };

  if (page === 'landing') {
    return (
      <>
        <LandingPage
          workflows={workflows}
          evidence={evidence}
          onNavigate={(p, params) => navigate(p, params)}
          onOpenNewUnitModal={() => setShowNewUnit(true)}
        />
        {showNewUnit && <NewUnitModal onClose={() => setShowNewUnit(false)} onCreateUnit={handleCreateUnit} />}
      </>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <Sidebar
          currentPage={page}
          onNavigate={(p) => {
            navigate(p);
            setMobileNavOpen(false);
          }}
          agentHealth={agentHealth}
          mobileOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        {/* Main area */}
        <div className="w-full min-w-0 flex-1 flex flex-col md:pl-60">

          {/* Topbar */}
          <header
            className="sticky top-0 z-30 h-14 px-3 sm:px-6 flex items-center justify-between gap-3 sm:gap-4 flex-shrink-0"
            style={{ background: 'var(--bg-topbar)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}
          >
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                className="md:hidden flex-shrink-0 p-2 rounded-lg text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                onClick={() => setMobileNavOpen((open) => !open)}
                aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
                aria-expanded={mobileNavOpen}
                aria-controls="app-navigation"
              >
                {mobileNavOpen ? <X size={17} /> : <Menu size={17} />}
              </button>
              <button
                className="flex items-center gap-1.5 text-slate-500 hover:text-blue-400 transition-colors"
                onClick={() => navigate('landing')}
                style={{ fontSize: 13 }}
              >
                <LayoutGrid size={14} />
                <span className="font-poppins font-medium hidden sm:inline">Platform</span>
              </button>
              <ChevronRight size={13} className="text-slate-700" />
              <span className="font-heading font-bold text-white" style={{ fontSize: 14 }}>
                {PAGE_LABELS[page] || 'Dashboard'}
              </span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="text"
                  placeholder="Search units, SKU, PO…"
                  className="pl-8 pr-3 py-1.5 rounded-lg text-slate-300 text-xs placeholder-slate-600 outline-none transition-all"
                  style={{ background: '#131822', border: '1px solid #1E2D45', fontSize: 12, width: 220 }}
                  onFocus={(e) => { e.target.style.borderColor = '#2563EB'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#1E2D45'; }}
                />
              </div>

              {/* Org selector */}
              <div
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                style={{ background: '#131822', border: '1px solid #1E2D45' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 pulse-dot" />
                <select
                  aria-label="Organization"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  className="bg-transparent border-0 outline-none cursor-pointer font-poppins font-medium text-slate-300"
                  style={{ fontSize: 12 }}
                >
                  <option value="org_demo_alpha" style={{ background: '#131822' }}>org_demo_alpha</option>
                  <option value="org_demo_bravo" style={{ background: '#131822' }}>org_demo_bravo</option>
                </select>
              </div>

              {/* Notifications */}
              <button
                className="relative p-1.5 rounded-lg transition-colors"
                style={{ background: '#131822', border: '1px solid #1E2D45' }}
                title="Notifications"
              >
                <Bell size={15} className="text-slate-400" />
                {exceptionsCount > 0 && (
                  <span
                    className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
                    style={{ background: '#EF4444' }}
                  />
                )}
              </button>

              {/* Refresh */}
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-blue-300 transition-colors"
                style={{ background: '#131822', border: '1px solid #1E2D45', fontSize: 12 }}
                onClick={loadData}
                disabled={isRefreshing}
                title={lastRefresh ? `Last synced: ${lastRefresh.toLocaleTimeString()}` : 'Sync data'}
              >
                <RefreshCw size={13} className={`text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline font-poppins font-medium">Sync</span>
              </button>

              {/* New Unit */}
              <button
                className="btn btn-primary"
                onClick={() => setShowNewUnit(true)}
              >
                <PlusCircle size={14} />
                <span className="hidden sm:inline">New Unit</span>
              </button>
            </div>
          </header>

          {/* Error banner */}
          {actionError && (
            <div
              className="mx-6 mt-3 p-3 rounded-lg flex items-center justify-between text-xs font-poppins"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171' }}
            >
              <span>{actionError}</span>
              <button
                onClick={() => setActionError('')}
                className="ml-4 underline font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 p-3 sm:p-6 space-y-6 max-w-[1800px] mx-auto w-full">
            {renderPage()}
          </main>
        </div>
      </div>

      {showNewUnit && (
        <NewUnitModal onClose={() => setShowNewUnit(false)} onCreateUnit={handleCreateUnit} />
      )}
    </div>
  );
}
