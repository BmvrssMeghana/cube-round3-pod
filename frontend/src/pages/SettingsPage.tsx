import React, { useEffect, useState } from 'react';
import { fetchHealth } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    fetchHealth().then(setHealth);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800 }}>System Settings & Agent Health</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Inspect agent registry health, flow configurations, and database connections.
        </p>
      </div>

      <div className="glass-panel">
        <div className="panel-title">
          <span>Agent Registry Health Monitor</span>
          <span style={{ background: 'var(--color-pass-bg)', color: 'var(--color-pass)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
            Status: {health?.status?.toUpperCase() || 'OK'}
          </span>
        </div>

        <div style={{ fontSize: '13px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
          Active Flow: <code>{health?.flow || 'standard-fba-mfn'}</code>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {['receiving', 'prep', 'pack', 'returns', 'recovery'].map((agentName) => {
            const info = health?.agents?.[agentName] || { status: 'ok', mode: 'inproc' };

            return (
              <div key={agentName} style={{ background: 'rgba(19, 27, 46, 0.6)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ textTransform: 'uppercase', fontWeight: 800, fontSize: '13px', color: 'var(--accent-secondary)' }}>
                  {agentName} Agent
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-pass)', marginTop: '6px', fontWeight: 600 }}>
                  ● {info.status.toUpperCase()} ({info.mode || 'inproc'})
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Contract Version: v1.0
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
