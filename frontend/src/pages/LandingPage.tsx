import React, { useMemo } from 'react';
import { LogIn, Moon, Sun, ArrowUpRight, Layers, Shield, GitBranch, CheckCircle2, ChevronRight } from 'lucide-react';
import type { WorkflowState, EvidenceRecord } from '../types';

interface LandingPageProps {
  workflows: WorkflowState[];
  evidence: Record<string, EvidenceRecord>;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onSignIn: () => void;
  onCreateOrganization: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const AGENTS = [
  {
    code: 'RCV',
    name: 'Receiving',
    detail: 'Inbound verification',
    description: "Establish the unit's identity and record evidence captured at intake.",
    page: 'receiving',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.03) 100%)',
    stage: 'Stage 1 of 5',
  },
  {
    code: 'PRP',
    name: 'Prep',
    detail: 'Preparation compliance',
    description: 'Check product-specific preparation requirements and preserve each check result.',
    page: 'prep',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.03) 100%)',
    stage: 'Stage 2 of 5',
  },
  {
    code: 'PCK',
    name: 'Pack',
    detail: 'Packing verification',
    description: 'Verify packing requirements and connect outcomes to the same unit record.',
    page: 'pack',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0.03) 100%)',
    stage: 'Stage 3 of 5',
  },
  {
    code: 'RTN',
    name: 'Returns',
    detail: 'Return inspection',
    description: 'Evaluate returned units using observations and upstream evidence.',
    page: 'returns',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.03) 100%)',
    stage: 'Stage 4 of 5',
  },
  {
    code: 'RCY',
    name: 'Recovery',
    detail: 'Fee recovery evaluation',
    description: 'Evaluate fees against upstream records to support evidence-backed claims.',
    page: 'recovery',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.03) 100%)',
    stage: 'Stage 5 of 5',
  },
] as const;

const PRINCIPLES = [
  {
    icon: <Layers size={20} />,
    number: '01',
    title: 'Capture every decision',
    description: 'Keep stage checks and outcomes attached to the physical unit they describe — building an unbroken evidence trail.',
    color: '#3b82f6',
  },
  {
    icon: <GitBranch size={20} />,
    number: '02',
    title: 'Preserve the chain',
    description: 'Connect each downstream decision to its actual upstream records and evidence — no disconnected data silos.',
    color: '#8b5cf6',
  },
  {
    icon: <Shield size={20} />,
    number: '03',
    title: 'Escalate uncertainty',
    description: 'Route unresolved outcomes to human review instead of presenting guesses as verified facts.',
    color: '#06b6d4',
  },
];

export function LandingPage({
  workflows,
  evidence,
  onNavigate,
  onSignIn,
  onCreateOrganization,
  theme,
  onToggleTheme,
}: LandingPageProps) {
  const metrics = useMemo(() => {
    const completed = workflows.filter((w) => w.status === 'COMPLETED').length;
    const exceptions = workflows.filter((w) => w.status === 'HALTED' || w.status === 'DEGRADED').length;
    return {
      total: workflows.length,
      completed,
      exceptions,
      active: Math.max(0, workflows.length - completed - exceptions),
      evidenceRecords: Object.keys(evidence).length,
    };
  }, [workflows, evidence]);

  const S = styles;

  return (
    <div style={S.root}>
      {/* Animated background blobs */}
      <div style={S.blobTL} />
      <div style={S.blobBR} />
      <div style={S.blobCenter} />

      {/* ── HEADER ── */}
      <header style={S.header}>
        <div style={S.headerInner}>
          {/* Logo */}
          <button type="button" style={S.logoBtn} onClick={() => onNavigate('command-center')}>
            <span style={S.logoIcon}>C</span>
            <span>
              <span style={S.logoText}>CUBE</span>
              <span style={S.logoSub}>EvidenceChain OS</span>
            </span>
          </button>

          {/* Nav */}
          <nav style={S.nav}>
            {[
              { label: 'Overview', page: 'command-center', active: true },
              { label: 'Operations', page: 'receiving', active: false },
              { label: 'Unit Passports', page: 'passport', active: false },
              { label: 'Reviews', page: 'exceptions', active: false },
              { label: 'Analytics', page: 'analytics', active: false },
            ].map((item) => (
              <button
                key={item.page}
                type="button"
                onClick={() => onNavigate(item.page)}
                style={item.active ? S.navItemActive : S.navItem}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div style={S.headerActions}>
            <button type="button" onClick={onToggleTheme} style={S.themeToggle} title="Toggle theme">
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
              <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
            <button type="button" onClick={onCreateOrganization} style={S.signUpBtn}>
              Sign up
            </button>
            <button type="button" onClick={onSignIn} style={S.loginBtn}>
              <LogIn size={14} />
              <span>Log in</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={S.main}>

        {/* ── HERO ── */}
        <section style={S.heroSection}>
          {/* Badge */}
          <div style={S.heroBadge}>
            <span style={S.heroBadgeDot} />
            One physical unit. One continuous record.
          </div>

          {/* Headline */}
          <h1 style={S.heroH1}>
            Every handoff<br />
            <span style={S.heroAccent}>leaves evidence.</span>
          </h1>

          <p style={S.heroSubtitle}>
            CUBE connects receiving, preparation, packing, returns, and recovery through a single
            Unit Passport. Each operational decision is linked to its checks, evidence, upstream
            records, and review history—so teams act with context instead of chasing disconnected records.
          </p>

          {/* CTA buttons */}
          <div style={S.ctaRow}>
            <button type="button" onClick={onSignIn} style={S.ctaPrimary}>
              Sign in to get started
              <ArrowUpRight size={15} />
            </button>
            <button type="button" onClick={onCreateOrganization} style={S.ctaSecondary}>
              Create organization
            </button>
            <button type="button" onClick={() => onNavigate('command-center')} style={S.ctaGhost}>
              Open command center
            </button>
          </div>

          <div style={S.heroTags}>
            <span style={S.tag}>Evidence-linked decisions</span>
            <span style={S.tagDot}>•</span>
            <span style={S.tag}>Human review for uncertainty</span>
            <span style={S.tagDot}>•</span>
            <span style={S.tag}>Traceable stage history</span>
          </div>

          {/* Metrics strip (only if data) */}
          {metrics.total > 0 && (
            <div style={S.metricsRow}>
              {[
                { label: 'Active workflows', value: metrics.total, color: '#3b82f6' },
                { label: 'Completed', value: metrics.completed, color: '#22c55e' },
                { label: 'Need review', value: metrics.exceptions, color: '#f59e0b' },
                { label: 'Evidence records', value: metrics.evidenceRecords, color: '#8b5cf6' },
              ].map((m) => (
                <div key={m.label} style={S.metricCard}>
                  <div style={{ ...S.metricValue, color: m.color }}>{m.value.toLocaleString()}</div>
                  <div style={S.metricLabel}>{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── UNIT LIFECYCLE PANEL ── */}
        <section style={S.lifecycleSection}>
          <div style={S.lifecyclePill}>
            <span style={S.lifecyclePillDot} />
            The unit lifecycle
          </div>
          <h2 style={S.lifecycleH2}>One record across every stage</h2>
          <p style={S.lifecycleSub}>Five agents. One evidence chain. Each stage builds on the last.</p>

          <div style={S.stagesGrid}>
            {AGENTS.map((agent, i) => (
              <button
                key={agent.code}
                type="button"
                onClick={() => onNavigate(agent.page)}
                style={{ ...S.stageCard, background: agent.gradient }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.borderColor = agent.color + '60';
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${agent.color}20`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.3)';
                }}
              >
                <div style={S.stageTop}>
                  <span style={{ ...S.stageCode, color: agent.color, background: agent.color + '18' }}>
                    {agent.code}
                  </span>
                  <span style={{ ...S.stageStage, color: agent.color + 'cc' }}>{agent.stage}</span>
                </div>
                <h3 style={S.stageName}>{agent.name}</h3>
                <p style={S.stageDetail}>{agent.detail}</p>
                <p style={S.stageDesc}>{agent.description}</p>
                <div style={{ ...S.stageFooter, borderTopColor: agent.color + '25' }}>
                  <span style={S.stageOpen}>Open workspace</span>
                  <ArrowUpRight size={13} style={{ color: agent.color }} />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── PIPELINE FLOW ── */}
        <section style={S.pipelineSection}>
          <div style={S.pipelineInner}>
            <div style={S.pipelineLeft}>
              <div style={S.sectionLabel}>Intelligent orchestration</div>
              <h2 style={S.pipelineH2}>Connected operational stages</h2>
              <p style={S.pipelineBody}>
                Every inspection feeds the next. Receiving unlocks Prep. Prep and Pack together
                enable Returns. Recovery uses the full upstream chain to build evidence-backed claims.
                No stage runs in isolation.
              </p>
              <div style={S.pipelineBullets}>
                {[
                  'Automatic prerequisite checking',
                  'Skipped stages when route doesn\'t apply',
                  'Human review escalation for uncertainty',
                  'Full evidence bundle per workflow',
                ].map((b) => (
                  <div key={b} style={S.bullet}>
                    <CheckCircle2 size={14} color="#22c55e" />
                    <span style={S.bulletText}>{b}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => onNavigate('receiving')} style={S.ctaPrimary}>
                Open operations hub
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Pipeline flow diagram */}
            <div style={S.pipelineRight}>
              {AGENTS.map((agent, i) => (
                <div key={agent.code}>
                  <div style={S.flowRow}>
                    <div style={{ ...S.flowDot, background: agent.color }} />
                    <div style={S.flowCard}>
                      <span style={{ ...S.flowCode, color: agent.color }}>{agent.code}</span>
                      <span style={S.flowName}>{agent.name}</span>
                      <span style={S.flowDetail}>— {agent.detail}</span>
                    </div>
                  </div>
                  {i < AGENTS.length - 1 && <div style={S.flowLine} />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRINCIPLES ── */}
        <section style={S.principlesSection}>
          <div style={S.sectionLabel}>Evidence-first design</div>
          <h2 style={S.principlesH2}>Built on three commitments</h2>
          <div style={S.principlesGrid}>
            {PRINCIPLES.map((p) => (
              <div key={p.number} style={S.principleCard}>
                <div style={{ ...S.principleIcon, color: p.color, background: p.color + '18' }}>
                  {p.icon}
                </div>
                <div style={{ ...S.principleNum, color: p.color }}>{p.number}</div>
                <h3 style={S.principleTitle}>{p.title}</h3>
                <p style={S.principleDesc}>{p.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA BANNER ── */}
        <section style={S.ctaBanner}>
          <div style={S.ctaBannerGlow} />
          <h2 style={S.ctaBannerH2}>Ready to build your evidence chain?</h2>
          <p style={S.ctaBannerSub}>Sign in or create an organization to start tracking units across all five operational stages.</p>
          <div style={S.ctaRow}>
            <button type="button" onClick={onSignIn} style={S.ctaPrimary}>
              <LogIn size={15} />
              Sign in to get started
            </button>
            <button type="button" onClick={onCreateOrganization} style={S.ctaSecondary}>
              Create organization
            </button>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div>
            <span style={S.footerBrand}>CUBE</span>
            <span style={S.footerSlash}> / </span>
            <span style={S.footerTagline}>EvidenceChain OS</span>
          </div>
          <p style={S.footerCaption}>One physical unit. One connected operational record.</p>
          <button type="button" onClick={() => onNavigate('settings')} style={S.footerLink}>
            System settings →
          </button>
        </div>
      </footer>
    </div>
  );
}

// ─── Pure inline style system ─────────────────────────────────────────────────
const BG = '#07090f';
const SURFACE = '#0d1117';
const CARD = '#131822';
const BORDER = 'rgba(255,255,255,0.08)';
const BLUE = '#3b82f6';
const TEXT = '#e7edf6';
const MUTED = '#8899b0';
const SUBTLE = '#546070';

const styles = {
  root: {
    minHeight: '100vh',
    background: BG,
    color: TEXT,
    fontFamily: "'Poppins', system-ui, sans-serif",
    fontSize: 14,
    lineHeight: 1.6,
    overflowX: 'hidden' as const,
    position: 'relative' as const,
  },
  blobTL: {
    position: 'fixed' as const,
    top: -200,
    left: -200,
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)',
    pointerEvents: 'none' as const,
    zIndex: 0,
  },
  blobBR: {
    position: 'fixed' as const,
    bottom: -300,
    right: -200,
    width: 700,
    height: 700,
    borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 70%)',
    pointerEvents: 'none' as const,
    zIndex: 0,
  },
  blobCenter: {
    position: 'fixed' as const,
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 900,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(59,130,246,0.04) 0%, transparent 60%)',
    pointerEvents: 'none' as const,
    zIndex: 0,
  },

  // HEADER
  header: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    background: 'rgba(7,9,15,0.85)',
    backdropFilter: 'blur(20px)',
    borderBottom: `1px solid ${BORDER}`,
  },
  headerInner: {
    maxWidth: 1440,
    margin: '0 auto',
    padding: '0 24px',
    height: 68,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  logoBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  },
  logoIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    color: '#fff',
    fontWeight: 900,
    fontSize: 16,
    fontFamily: 'Manrope, system-ui, sans-serif',
    letterSpacing: '-0.05em',
    flexShrink: 0,
    boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
  },
  logoText: {
    display: 'block',
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontWeight: 800,
    fontSize: 18,
    color: '#fff',
    letterSpacing: '-0.06em',
    lineHeight: 1,
  },
  logoSub: {
    display: 'block',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: SUBTLE,
    marginTop: 2,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  navItem: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 14px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    color: MUTED,
    transition: 'color 0.2s, background 0.2s',
    fontFamily: 'inherit',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 14px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    fontFamily: 'inherit',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  themeToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: '6px 12px',
    color: MUTED,
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  signUpBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: `1px solid rgba(255,255,255,0.15)`,
    borderRadius: 8,
    padding: '7px 16px',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  loginBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    border: 'none',
    borderRadius: 8,
    padding: '7px 16px',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 14px rgba(59,130,246,0.4)',
  },

  // MAIN
  main: {
    maxWidth: 1440,
    margin: '0 auto',
    padding: '0 24px',
    position: 'relative' as const,
    zIndex: 1,
  },

  // HERO
  heroSection: {
    paddingTop: 100,
    paddingBottom: 80,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 16px',
    borderRadius: 999,
    border: '1px solid rgba(59,130,246,0.3)',
    background: 'rgba(59,130,246,0.08)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: '#93c5fd',
    marginBottom: 32,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: BLUE,
    display: 'inline-block',
    boxShadow: '0 0 8px #3b82f6',
  },
  heroH1: {
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontSize: 'clamp(42px, 7vw, 84px)',
    fontWeight: 800,
    lineHeight: 1.0,
    letterSpacing: '-0.05em',
    color: '#ffffff',
    margin: '0 0 24px',
  },
  heroAccent: {
    background: 'linear-gradient(135deg, #60a5fa, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 1.75,
    color: MUTED,
    maxWidth: 680,
    margin: '0 auto 40px',
  },
  ctaRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 12,
    justifyContent: 'center',
    marginBottom: 32,
  },
  ctaPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    border: 'none',
    borderRadius: 10,
    padding: '13px 24px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 20px rgba(59,130,246,0.45)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  ctaSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(59,130,246,0.08)',
    border: '1px solid rgba(59,130,246,0.3)',
    borderRadius: 10,
    padding: '13px 24px',
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  ctaGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: '13px 24px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  heroTags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tag: {
    fontSize: 11,
    color: SUBTLE,
  },
  tagDot: {
    fontSize: 11,
    color: '#2a3a50',
  },
  metricsRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 16,
    justifyContent: 'center',
    marginTop: 48,
  },
  metricCard: {
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: '20px 28px',
    textAlign: 'center' as const,
    minWidth: 120,
  },
  metricValue: {
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontSize: 32,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '-0.04em',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: SUBTLE,
    marginTop: 6,
    letterSpacing: '0.05em',
  },

  // LIFECYCLE
  lifecycleSection: {
    paddingTop: 40,
    paddingBottom: 80,
    textAlign: 'center' as const,
  },
  lifecyclePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: '#93c5fd',
    marginBottom: 16,
  },
  lifecyclePillDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: BLUE,
    display: 'inline-block',
  },
  lifecycleH2: {
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontSize: 'clamp(28px, 4vw, 40px)',
    fontWeight: 800,
    letterSpacing: '-0.04em',
    color: '#fff',
    margin: '0 0 12px',
  },
  lifecycleSub: {
    fontSize: 15,
    color: MUTED,
    marginBottom: 48,
  },
  stagesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    textAlign: 'left' as const,
  },
  stageCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0,
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
    transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
  },
  stageTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stageCode: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 6,
    letterSpacing: '0.06em',
  },
  stageStage: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.06em',
  },
  stageName: {
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontSize: 20,
    fontWeight: 800,
    color: '#fff',
    margin: '0 0 4px',
    letterSpacing: '-0.03em',
  },
  stageDetail: {
    fontSize: 11,
    fontWeight: 600,
    color: SUBTLE,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    marginBottom: 12,
  },
  stageDesc: {
    fontSize: 12,
    color: MUTED,
    lineHeight: 1.6,
    flex: 1,
    marginBottom: 16,
  },
  stageFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '1px solid transparent',
    paddingTop: 12,
    fontSize: 11,
    fontWeight: 600,
    color: SUBTLE,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  },
  stageOpen: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  },

  // PIPELINE
  pipelineSection: {
    paddingTop: 40,
    paddingBottom: 80,
  },
  pipelineInner: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 64,
    alignItems: 'center',
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 20,
    padding: '56px 48px',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: '#60a5fa',
    marginBottom: 12,
  },
  pipelineLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0,
  },
  pipelineH2: {
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontSize: 'clamp(24px, 3vw, 34px)',
    fontWeight: 800,
    letterSpacing: '-0.04em',
    color: '#fff',
    margin: '0 0 16px',
  },
  pipelineBody: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 1.75,
    marginBottom: 24,
  },
  pipelineBullets: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
    marginBottom: 32,
  },
  bullet: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  bulletText: {
    fontSize: 13,
    color: TEXT,
    fontWeight: 500,
  },
  pipelineRight: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  flowRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  flowDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 0 10px currentColor',
  },
  flowCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: '10px 16px',
    flex: 1,
  },
  flowCode: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.06em',
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.06)',
  },
  flowName: {
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
  },
  flowDetail: {
    fontSize: 11,
    color: SUBTLE,
  },
  flowLine: {
    width: 2,
    height: 20,
    background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
    marginLeft: 5,
    borderRadius: 2,
  },

  // PRINCIPLES
  principlesSection: {
    paddingTop: 40,
    paddingBottom: 80,
    textAlign: 'center' as const,
  },
  principlesH2: {
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontSize: 'clamp(24px, 3.5vw, 36px)',
    fontWeight: 800,
    letterSpacing: '-0.04em',
    color: '#fff',
    margin: '0 0 40px',
  },
  principlesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 20,
    textAlign: 'left' as const,
  },
  principleCard: {
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    padding: '28px 24px',
  },
  principleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  principleNum: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.1em',
    marginBottom: 8,
  },
  principleTitle: {
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontSize: 18,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '-0.03em',
    margin: '0 0 10px',
  },
  principleDesc: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 1.7,
    margin: 0,
  },

  // CTA BANNER
  ctaBanner: {
    position: 'relative' as const,
    background: 'linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(139,92,246,0.12) 100%)',
    border: '1px solid rgba(59,130,246,0.25)',
    borderRadius: 20,
    padding: '64px 40px',
    textAlign: 'center' as const,
    marginBottom: 80,
    overflow: 'hidden',
  },
  ctaBannerGlow: {
    position: 'absolute' as const,
    top: -100,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 500,
    height: 300,
    borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(59,130,246,0.2) 0%, transparent 70%)',
    pointerEvents: 'none' as const,
  },
  ctaBannerH2: {
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontSize: 'clamp(24px, 4vw, 38px)',
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '-0.04em',
    margin: '0 0 16px',
    position: 'relative' as const,
  },
  ctaBannerSub: {
    fontSize: 15,
    color: MUTED,
    maxWidth: 560,
    margin: '0 auto 32px',
    position: 'relative' as const,
  },

  // FOOTER
  footer: {
    borderTop: `1px solid ${BORDER}`,
    background: 'rgba(0,0,0,0.3)',
  },
  footerInner: {
    maxWidth: 1440,
    margin: '0 auto',
    padding: '32px 24px',
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  footerBrand: {
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontWeight: 800,
    fontSize: 14,
    color: '#fff',
    letterSpacing: '-0.04em',
  },
  footerSlash: {
    color: '#2a3a50',
    margin: '0 4px',
  },
  footerTagline: {
    fontSize: 12,
    color: SUBTLE,
  },
  footerCaption: {
    fontSize: 12,
    color: SUBTLE,
    margin: 0,
  },
  footerLink: {
    background: 'none',
    border: 'none',
    fontSize: 12,
    color: MUTED,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
