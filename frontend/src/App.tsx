import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import { CommandCenter } from './pages/CommandCenter';
import { OperationsPage } from './pages/OperationsPage';
import { UnitPassportPage } from './pages/UnitPassportPage';
import { ExceptionsPage } from './pages/ExceptionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import Evaluation from './pages/Evaluation';
import SettingsPage from './pages/SettingsPage';
import { applyOverride, createUnit, fetchCurrentUser, fetchHealth, fetchWorkflowBundle, fetchWorkflows, runStageInspection, runWorkflow, signOut, type AuthSession, type AuthUser } from './services/api';
import type { WorkflowState, EvidenceRecord, StageName } from './types';

import { RefreshCw, PlusCircle, Search, Bell, ChevronRight, LayoutGrid, Menu, X, LogOut } from 'lucide-react';
import { NewUnitModal } from './components/NewUnitModal';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';

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
  const [org, setOrg] = useState('');
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'organization'>('signin');
  const [workflows, setWorkflows] = useState<WorkflowState[]>([]);
  const [evidence, setEvidence] = useState<Record<string, EvidenceRecord>>({});
  const [selectedUnit, setSelectedUnit] = useState<string>('UNIT-0014');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [agentHealth, setAgentHealth] = useState<Record<string, { status: string }>>({});
  const [actionError, setActionError] = useState('');
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [dashboardRefreshToken, setDashboardRefreshToken] = useState(0);
  const [liveBackend, setLiveBackend] = useState(false);
  const [databaseEngine, setDatabaseEngine] = useState('unknown');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = localStorage.getItem('cube-theme');
    const initialTheme = savedTheme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = initialTheme;
    return initialTheme;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('cube-theme', theme);
  }, [theme]);

  useEffect(() => {
    let active = true;
    void fetchCurrentUser()
      .then((user) => {
        if (!active) return;
        setAuthUser(user);
        setOrg(user.org_id);
      })
      .catch(() => {
        signOut();
      });
    return () => { active = false; };
  }, []);

  const handleAuthenticated = (session: AuthSession) => {
    setAuthUser(session.user);
    setOrg(session.user.org_id);
    setShowAuth(false);
    setPage('command-center');
    setActionError('');
  };

  const handleSignOut = () => {
    signOut();
    setAuthUser(null);
    setOrg('');
    setShowAuth(false);
    setPage('landing');
    window.scrollTo(0, 0);
    setWorkflows([]);
    setEvidence({});
  };

  const loadData = useCallback(async () => {
    if (!org) return;
    setIsRefreshing(true);
    try {
      setActionError('');
      const health = await fetchHealth().catch((error) => {
        setLiveBackend(false);
        setDatabaseEngine('unknown');
        setAgentHealth({});
        throw error;
      });
      setLiveBackend(health.database.status === 'ok');
      setDatabaseEngine(health.database.engine || 'unknown');
      setAgentHealth(health.agents);
      const liveWfs = await fetchWorkflows(org);
      setWorkflows(liveWfs.filter((workflow) => workflow.org_id === org));
      setLastRefresh(new Date());
    } catch (error) {
      setWorkflows([]);
      setEvidence({});
      setActionError(error instanceof Error ? error.message : 'Could not load records from the configured database.');
    } finally {
      setIsRefreshing(false);
    }
  }, [org]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const navigate = (newPage: string, params?: Record<string, string>) => {
    if (!authUser && newPage !== 'landing') {
      window.scrollTo(0, 0);
      setShowAuth(true);
      return;
    }
    window.scrollTo(0, 0);
    setPage(newPage as Page);
    if (params?.unitId) {
      setSelectedUnit(params.unitId);
      if (newPage === 'passport') {
        void fetchWorkflowBundle(params.unitId, org).then((bundle) => {
          setWorkflows((current) => [bundle.workflow, ...current.filter((item) => item.workflow_id !== bundle.workflow.workflow_id)]);
          setEvidence((current) => ({ ...current, ...bundle.evidence }));
        }).catch((error) => {
          setActionError(error instanceof Error ? error.message : `Could not load the database evidence for ${params.unitId}.`);
        });
      }
    }
    setPageParams(params || {});
  };

  const handleRunWorkflow = async (unitId: string) => {
    try {
      setActionError('');
      const updatedWf = await runWorkflow(unitId, org);
      setWorkflows((prev) => [updatedWf, ...prev.filter((workflow) => workflow.subject_id !== unitId)]);
      setDashboardRefreshToken((token) => token + 1);
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
      setDashboardRefreshToken((token) => token + 1);
      await loadData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not save the review override.');
      throw error;
    }
  };

  const handleRunInspection = async (unitId: string, stage: StageName, payload: any) => {
    const workflow = workflows.find((item) => item.subject_id === unitId);
    const inferredRoute = workflow?.stage_results.find((item) => item.stage === 'prep')?.state === 'skipped' ? 'mfn' : 'fba';
    const route = String(workflow?.context?.route || inferredRoute).toLowerCase();
    const returned = typeof workflow?.context?.returned === 'boolean'
      ? workflow.context.returned
      : workflow?.stage_results.find((item) => item.stage === 'returns')?.state === 'pending' ||
        workflow?.stage_results.find((item) => item.stage === 'returns')?.state === 'completed';
    setActionError('');
    try {
      const result = await runStageInspection(unitId, stage, payload, org, route, returned);
      setWorkflows((prev) => [result.workflow, ...prev.filter((item) => item.subject_id !== unitId)]);
      setEvidence((prev) => ({ ...prev, [result.evidence.record_id]: result.evidence }));
      setDashboardRefreshToken((token) => token + 1);
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
    captures?: any[],
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
      captures,
    });
    setWorkflows((prev) => [workflow, ...prev.filter((item) => item.subject_id !== unitId)]);
    setDashboardRefreshToken((token) => token + 1);
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
            refreshToken={dashboardRefreshToken}
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
            onApplyOverride={handleApplyOverride}
          />
        );
      case 'exceptions':
        return (
          <ExceptionsPage
            workflows={workflows}
            orgId={org}
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
            refreshToken={dashboardRefreshToken}
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
            refreshToken={dashboardRefreshToken}
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

  if (showAuth && !authUser) {
    return (
      <AuthPage
        onAuthenticated={handleAuthenticated}
        initialMode={authInitialMode}
        onBack={() => { window.scrollTo(0, 0); setShowAuth(false); setAuthInitialMode('signin'); }}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
      />
    );
  }

  if (page === 'landing' || !authUser) {
    return (
      <>
        <LandingPage
          workflows={workflows}
          evidence={evidence}
          onNavigate={navigate}
          onSignIn={() => { window.scrollTo(0, 0); setAuthInitialMode('signin'); setShowAuth(true); }}
          onCreateOrganization={() => { window.scrollTo(0, 0); setAuthInitialMode('organization'); setShowAuth(true); }}
          theme={theme}
          onToggleTheme={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
        />
        {authUser && showNewUnit && <NewUnitModal onClose={() => setShowNewUnit(false)} onCreateUnit={handleCreateUnit} />}
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

              <span className="hidden sm:inline max-w-40 truncate text-xs font-medium text-slate-400" title={authUser.org_name}>
                {authUser.org_name}
              </span>

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
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={15} />
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
