import React, { useMemo } from 'react';
import type { WorkflowState, EvidenceRecord } from '../types';

interface LandingPageProps {
  workflows: WorkflowState[];
  evidence: Record<string, EvidenceRecord>;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onOpenNewUnitModal: () => void;
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
  onOpenNewUnitModal,
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
    <div className="landing-page min-h-screen bg-[#07080B] text-slate-100 font-sans antialiased selection:bg-[#89CFF0] selection:text-black">
      {/* Status strip: deliberately avoids claiming that services are live unless health data is supplied. */}
      <div className="border-b border-white/[0.08] bg-[#0D0F14]">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="inline-block h-2 w-2 rounded-full bg-[#FFE500]" />
            <span className="font-semibold tracking-wide">CUBE OPERATIONS</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">Evidence-led commerce workflows</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Operational status is based on the records currently loaded
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#07080B]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="group flex items-center gap-3"
            onClick={() => onNavigate('command-center')}
            aria-label="Open CUBE command center"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFE500] text-sm font-black tracking-tight text-black">
              C
            </span>
            <span className="text-left">
              <span className="block font-manrope text-xl font-extrabold tracking-[-0.06em] text-white group-hover:text-[#FFE500]">
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

          <button
            type="button"
            onClick={onOpenNewUnitModal}
            className="pill-btn inline-flex items-center gap-2 rounded-full bg-[#FFE500] px-4 py-2.5 text-xs font-bold text-black transition hover:bg-[#E8F6FC] sm:px-5"
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            <span className="hidden sm:inline">New unit workflow</span>
            <span className="sm:hidden">New unit</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-12 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.1] bg-[#10131A]">
          <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-[#FFE500]/[0.09] blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-120px] right-[22%] h-72 w-72 rounded-full bg-[#89CFF0]/[0.08] blur-3xl" />

          <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:p-14">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FFE500]/25 bg-[#FFE500]/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#FFE500]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FFE500]" />
                One physical unit. One continuous record.
              </div>

              <h1 className="max-w-4xl font-manrope text-4xl font-extrabold leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
                Every handoff
                <br />
                <span className="text-[#FFE500]">leaves evidence.</span>
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
                  onClick={onOpenNewUnitModal}
                  className="pill-btn inline-flex items-center gap-2 rounded-full bg-[#FFE500] px-6 py-3.5 text-xs font-extrabold uppercase tracking-wide text-black hover:bg-[#E8F6FC]"
                >
                  Start a unit workflow
                  <span aria-hidden="true">↗</span>
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
                <span className="rounded-lg border border-[#FFE500]/20 bg-[#FFE500]/[0.08] px-2 py-1 font-mono text-[10px] text-[#FFE500]">
                  CUBE / 05
                </span>
              </div>

              <div className="space-y-2">
                {AGENTS.map((agent, index) => (
                  <button
                    key={agent.code}
                    type="button"
                    onClick={() => onNavigate(agent.page)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left transition hover:border-[#FFE500]/30 hover:bg-white/[0.05]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFE500]/[0.09] font-mono text-xs font-bold text-[#FFE500]">
                      {agent.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white">{agent.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{agent.detail}</span>
                    </span>
                    <span className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-[#FFE500]">
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

        {/* Live values derived from the workflows and evidence supplied by the app. */}
        <section aria-labelledby="overview-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFE500]">
                Operational snapshot
              </p>
              <h2 id="overview-heading" className="mt-1 font-manrope text-2xl font-extrabold tracking-tight text-white">
                What needs attention?
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('command-center')}
              className="text-xs font-semibold text-slate-400 transition hover:text-[#FFE500]"
            >
              View full command center →
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Tracked workflows"
              value={metrics.total}
              description="Workflow records currently loaded"
              accent="yellow"
            />
            <MetricCard
              label="In progress"
              value={metrics.active}
              description="Not completed or flagged for attention"
              accent="blue"
            />
            <MetricCard
              label="Completed"
              value={metrics.completed}
              description="Workflows marked completed"
              accent="green"
            />
            <MetricCard
              label="Needs attention"
              value={metrics.exceptions}
              description="Halted or degraded workflows"
              accent="amber"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-[#0D0F14] px-4 py-3">
            <span className="text-xs text-slate-400">
              Evidence records available in the current app state
            </span>
            <span className="font-mono text-sm font-semibold text-white">
              {metrics.evidenceRecords.toLocaleString()}
            </span>
          </div>
        </section>

        {/* Agent entry points */}
        <section aria-labelledby="agents-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFE500]">
                Connected operational stages
              </p>
              <h2 id="agents-heading" className="mt-1 font-manrope text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Five agents. One evidence chain.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('receiving')}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-[#FFE500]/30 hover:text-[#FFE500]"
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
                className="group flex min-h-[220px] flex-col rounded-2xl border border-white/[0.09] bg-[#0D0F14] p-5 text-left transition hover:-translate-y-1 hover:border-[#FFE500]/35 hover:bg-[#11151D]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#FFE500]">{agent.code}</span>
                  <span className="text-slate-600 transition group-hover:text-[#FFE500]" aria-hidden="true">↗</span>
                </div>
                <h3 className="mt-6 font-manrope text-lg font-extrabold text-white">{agent.name}</h3>
                <p className="mt-2 flex-1 text-xs leading-6 text-slate-400">{agent.description}</p>
                <span className="mt-5 border-t border-white/[0.08] pt-3 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500 group-hover:text-[#FFE500]">
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
            className="self-start text-slate-400 hover:text-[#FFE500] md:self-auto"
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
  accent: 'yellow' | 'blue' | 'green' | 'amber';
}) {
  const accentClass = {
    yellow: 'bg-[#FFE500]',
    blue: 'bg-[#89CFF0]',
    green: 'bg-emerald-300',
    amber: 'bg-amber-300',
  }[accent];

  const valueClass = {
    yellow: 'text-[#FFE500]',
    blue: 'text-[#89CFF0]',
    green: 'text-emerald-300',
    amber: 'text-amber-300',
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
    <div className="rounded-2xl border border-white/[0.08] bg-[#0D0F14] p-5 sm:p-6">
      <span className="font-mono text-xs font-bold text-[#FFE500]">{number}</span>
      <h3 className="mt-4 font-manrope text-lg font-extrabold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
