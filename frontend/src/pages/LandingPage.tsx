import React, { useMemo } from 'react';
import { LogIn, Moon, Sun } from 'lucide-react';
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
    number: '01',
    name: 'Receiving',
    code: 'RCV',
    description: 'Establish the unit’s identity and record the evidence captured at intake.',
    page: 'receiving',
    detail: 'Inbound verification',
  },
  {
    number: '02',
    name: 'Prep',
    code: 'PRP',
    description: 'Check product-specific preparation requirements and preserve each check result.',
    page: 'prep',
    detail: 'Preparation compliance',
  },
  {
    number: '03',
    name: 'Pack',
    code: 'PCK',
    description: 'Verify packing requirements and connect the outcome to the same unit record.',
    page: 'pack',
    detail: 'Packing verification',
  },
  {
    number: '04',
    name: 'Returns',
    code: 'RTN',
    description: 'Evaluate returned units using available observations and upstream evidence.',
    page: 'returns',
    detail: 'Return inspection',
  },
  {
    number: '05',
    name: 'Recovery',
    code: 'RCY',
    description: 'Evaluate fees and charges against upstream records to support evidence-backed claims.',
    page: 'recovery',
    detail: 'Fee recovery evaluation',
  },
] as const;

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
    const exceptions = workflows.filter(
      (w) => w.status === 'HALTED' || w.status === 'DEGRADED',
    ).length;
    const active = workflows.length - completed - exceptions;

    return {
      total: workflows.length,
      completed,
      exceptions,
      active: Math.max(0, active),
      evidenceRecords: Object.keys(evidence).length,
    };
  }, [workflows, evidence]);

  return (
    <div className="landing-page min-h-screen bg-[#07080B] text-slate-100 font-sans antialiased selection:bg-blue-200 selection:text-black">
      {/* Status strip: deliberately avoids claiming that services are live unless health data is supplied. */}

      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#07080B]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="group flex items-center gap-3"
            onClick={() => onNavigate('command-center')}
            aria-label="Open CUBE command center"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-sm font-black tracking-tight text-white">
              C
            </span>
            <span className="text-left">
              <span className="block font-manrope text-xl font-extrabold tracking-[-0.06em] text-white group-hover:text-blue-400">
                CUBE
              </span>
              <span className="block text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                EvidenceChain OS
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
            <button
              type="button"
              onClick={() => onNavigate('command-center')}
              className="rounded-full bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white"
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => onNavigate('receiving')}
              className="rounded-full px-4 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              Operations
            </button>
            <button
              type="button"
              onClick={() => onNavigate('passport')}
              className="rounded-full px-4 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              Unit Passports
            </button>
            <button
              type="button"
              onClick={() => onNavigate('exceptions')}
              className="rounded-full px-4 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              Reviews
            </button>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="rounded-full px-4 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              Recovery & Analytics
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onToggleTheme} className="landing-theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              <span className="hidden sm:inline">{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
            <button type="button" onClick={onCreateOrganization} className="landing-create-organization">
              <span>Sign up</span>
            </button>
            <button type="button" onClick={onSignIn} className="landing-sign-in">
              <LogIn size={15} />
              <span>Log in</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-12 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.1] bg-[#10131A]">
          <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-blue-500/[0.12] blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-120px] right-[22%] h-72 w-72 rounded-full bg-[#89CFF0]/[0.08] blur-3xl" />

          <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:p-14">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                One physical unit. One continuous record.
              </div>

              <h1 className="max-w-4xl font-manrope text-4xl font-extrabold leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
                Every handoff
                <br />
                <span className="text-blue-400">leaves evidence.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
                CUBE connects receiving, preparation, packing, returns, and recovery through a
                single Unit Passport. Each operational decision is linked to its checks, evidence,
                upstream records, and review history—so teams can act with context instead of
                chasing disconnected records.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="pill-btn inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-3.5 text-xs font-extrabold uppercase tracking-wide text-white hover:bg-blue-600"
                >
                  Sign in to get started
                  <span aria-hidden="true">↗</span>
                </button>
                <button
                  type="button"
                  onClick={onCreateOrganization}
                  className="pill-btn rounded-full border border-blue-400/30 bg-blue-500/[0.08] px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-blue-300 hover:border-blue-400/60 hover:bg-blue-500/[0.14]"
                >
                  Create organization
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('command-center')}
                  className="pill-btn rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-white hover:border-white/30 hover:bg-white/[0.08]"
                >
                  Open command center
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-slate-500">
                <span>Evidence-linked decisions</span>
                <span>•</span>
                <span>Human review for uncertainty</span>
                <span>•</span>
                <span>Traceable stage history</span>
              </div>
            </div>

            {/* Product essence: the same unit moves through connected stages. */}
            <div className="rounded-2xl border border-white/[0.09] bg-black/30 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    The unit lifecycle
                  </p>
                  <h2 className="mt-1 font-manrope text-lg font-bold text-white">
                    One record across every stage
                  </h2>
                </div>
                <span className="rounded-lg border border-blue-500/20 bg-blue-500/[0.08] px-2 py-1 font-mono text-[10px] text-blue-400">
                  CUBE / 05
                </span>
              </div>

              <div className="space-y-2">
                {AGENTS.map((agent, index) => (
                  <button
                    key={agent.code}
                    type="button"
                    onClick={() => onNavigate(agent.page)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left transition hover:border-blue-500/30 hover:bg-white/[0.05]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/[0.09] font-mono text-xs font-bold text-blue-400">
                      {agent.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white">{agent.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{agent.detail}</span>
                    </span>
                    <span className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-blue-400">
                      →
                    </span>
                    {index < AGENTS.length - 1 && (
                      <span className="sr-only">Stage {index + 1} of 5</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#89CFF0]/15 bg-[#89CFF0]/[0.05] p-3.5">
                <span className="mt-0.5 text-[#89CFF0]" aria-hidden="true">↳</span>
                <p className="text-xs leading-5 text-slate-400">
                  Each stage should add to the same unit record. Uncertain outcomes can be routed
                  for human review; downstream stages must respect their prerequisites.
                </p>
              </div>
            </div>
          </div>
        </section>


        {/* Agent entry points */}
        <section aria-labelledby="agents-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-500">
                Connected operational stages
              </p>
              <h2 id="agents-heading" className="mt-1 font-manrope text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Five agents. One evidence chain.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('receiving')}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-blue-500/30 hover:text-blue-500"
            >
              Open operations hub →
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {AGENTS.map((agent) => (
              <button
                key={agent.code}
                type="button"
                onClick={() => onNavigate(agent.page)}
                className="group flex min-h-[220px] flex-col rounded-2xl border border-white/[0.09] bg-[#0D0F14] p-5 text-left transition hover:-translate-y-1 hover:border-blue-500/35 hover:bg-[#11151D]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-black">{agent.code}</span>
                  <span className="text-slate-600 transition group-hover:text-blue-400" aria-hidden="true">↗</span>
                </div>
                <h3 className="mt-6 font-manrope text-lg font-extrabold text-blue-600">{agent.name}</h3>
                <p className="mt-2 flex-1 text-xs leading-6 text-slate-400">{agent.description}</p>
                <span className="mt-5 border-t border-white/[0.08] pt-3 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500 group-hover:text-blue-400">
                  Open agent workspace
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Evidence-first principles */}
        <section className="grid gap-3 md:grid-cols-3">
          <PrincipleCard
            number="01"
            title="Capture the decision"
            description="Keep stage checks and outcomes attached to the physical unit they describe."
          />
          <PrincipleCard
            number="02"
            title="Preserve the chain"
            description="Connect each downstream decision to its actual upstream records and evidence."
          />
          <PrincipleCard
            number="03"
            title="Escalate uncertainty"
            description="Route unresolved outcomes to review instead of presenting guesses as verified facts."
          />
        </section>
      </main>

      <footer className="border-t border-white/[0.08] bg-[#07080B]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-8 text-xs text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <span className="font-manrope font-extrabold tracking-tight text-white">CUBE</span>
            <span className="mx-2 text-slate-700">/</span>
            EvidenceChain OS
          </div>
          <p>One physical unit. One connected operational record.</p>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="self-start text-slate-400 hover:text-blue-500 md:self-auto"
          >
            System settings →
          </button>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  accent,
}: {
  label: string;
  value: number;
  description: string;
  accent: 'blue';
}) {
  const accentClass = {
    blue: 'bg-blue-500',
  }[accent];

  const valueClass = {
    blue: 'text-blue-400',
  }[accent];

  return (
    <div className="rounded-2xl border border-white/[0.09] bg-[#0D0F14] p-5 transition hover:border-white/20">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${accentClass}`} />
        <span className="text-xs font-semibold text-slate-400">{label}</span>
      </div>
      <div className={`mt-5 font-manrope text-4xl font-extrabold tracking-tight ${valueClass}`}>
        {value.toLocaleString()}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-600">{description}</p>
    </div>
  );
}

function PrincipleCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#eaf2ff] p-5 sm:p-6">
      <span className="font-mono text-xs font-bold text-blue-500">{number}</span>
      <h3 className="mt-4 font-manrope text-lg font-extrabold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
