import { useState, type FormEvent } from 'react';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { signIn, signUp, type AuthSession } from '../services/api';

type AuthMode = 'signin' | 'organization';

interface AuthPageProps {
  onAuthenticated: (session: AuthSession) => void;
  onBack: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  initialMode?: AuthMode;
}

export function AuthPage({ onAuthenticated, onBack, theme, onToggleTheme, initialMode = 'signin' }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [team, setTeam] = useState<'alpha' | 'bravo'>('alpha');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('org_alpha');
  const [password, setPassword] = useState('root');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const session = mode === 'organization'
        ? await signUp({ mode: 'organization', org_name: organizationName, email, password })
        : await signIn(username, password);
      onAuthenticated(session);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const chooseTeam = (nextTeam: 'alpha' | 'bravo') => {
    setMode('signin');
    setTeam(nextTeam);
    setUsername(`org_${nextTeam}`);
    setPassword('root');
    setError('');
  };

  const chooseOrganizationMode = () => {
    setMode('organization');
    setError('');
  };

  return (
    <main className="auth-page min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl justify-between">
        <button type="button" onClick={onBack} className="auth-link inline-flex items-center gap-2 text-sm font-medium">
          <ArrowLeft size={16} /> Back to CUBE
        </button>
        <button type="button" onClick={onToggleTheme} className="auth-theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}>
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          <span>{theme === 'light' ? 'Dark' : 'Light'} theme</span>
        </button>
      </div>

      <section className="mx-auto mt-12 grid w-full max-w-5xl overflow-hidden rounded-3xl border shadow-xl md:mt-20 md:grid-cols-[1fr_0.9fr]">
        <div className="auth-intro hidden flex-col justify-between p-10 md:flex">
          <div>
            <div className="flex items-center gap-3">
              <span className="auth-mark">C</span>
              <span className="text-xl font-extrabold tracking-tight">CUBE</span>
            </div>
            <p className="mt-16 text-xs font-bold uppercase tracking-[0.2em] text-blue-500">Operations workspace</p>
            <h1 className="mt-4 max-w-md font-manrope text-4xl font-extrabold leading-tight tracking-tight">
              One unit. One connected evidence chain.
            </h1>
            <p className="auth-muted mt-5 max-w-md text-sm leading-7">
              Sign in to review workflows, evidence, and operational decisions for your organization.
            </p>
          </div>
          <p className="auth-muted text-xs">Organization-scoped access · Receiving to recovery</p>
        </div>

        <div className="auth-form-panel p-7 sm:p-10">
          <div className="md:hidden">
            <div className="flex items-center gap-3">
              <span className="auth-mark">C</span>
              <span className="text-xl font-extrabold tracking-tight">CUBE</span>
            </div>
          </div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-blue-500 md:mt-0">
            {mode === 'organization' ? 'New workspace' : 'Welcome back'}
          </p>
          <h2 className="mt-2 font-manrope text-2xl font-extrabold tracking-tight">
            {mode === 'organization' ? 'Create an organization' : 'Sign in to your workspace'}
          </h2>
          <p className="auth-muted mt-2 text-sm">
            {mode === 'organization' ? 'Set up a private workspace for your organization.' : 'Choose a team or use your organization login.'}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2" role="group" aria-label="Account type">
            <button
              type="button"
              onClick={() => chooseTeam('alpha')}
              aria-pressed={mode === 'signin' && team === 'alpha'}
              className={`auth-mode-button rounded-lg px-2 py-2 text-xs font-semibold ${mode === 'signin' && team === 'alpha' ? 'is-active' : ''}`}
            >
              Team Alpha
            </button>
            <button
              type="button"
              onClick={() => chooseTeam('bravo')}
              aria-pressed={mode === 'signin' && team === 'bravo'}
              className={`auth-mode-button rounded-lg px-2 py-2 text-xs font-semibold ${mode === 'signin' && team === 'bravo' ? 'is-active' : ''}`}
            >
              Team Bravo
            </button>
            <button
              type="button"
              onClick={chooseOrganizationMode}
              aria-pressed={mode === 'organization'}
              className={`auth-mode-button rounded-lg px-2 py-2 text-xs font-semibold ${mode === 'organization' ? 'is-active' : ''}`}
            >
              New organization
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {mode === 'organization' ? (
              <>
                <label className="auth-label block" htmlFor="organization-name">Organization name</label>
                <input
                  id="organization-name"
                  autoComplete="organization"
                  required
                  maxLength={80}
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  className="auth-input w-full rounded-xl px-4 py-3 text-sm"
                />
                <label className="auth-label block" htmlFor="account-email">Email</label>
                <input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="auth-input w-full rounded-xl px-4 py-3 text-sm"
                />
              </>
            ) : (
              <>
                <label className="auth-label block" htmlFor="account-username">Team login or email</label>
                <input
                  id="account-username"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="auth-input w-full rounded-xl px-4 py-3 text-sm"
                />
              </>
            )}
            <label className="auth-label block" htmlFor="account-password">Password</label>
            <input
              id="account-password"
              type="password"
              autoComplete={mode === 'organization' ? 'new-password' : 'current-password'}
              minLength={mode === 'organization' ? 12 : undefined}
              maxLength={256}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="auth-input w-full rounded-xl px-4 py-3 text-sm"
            />
            {mode === 'signin' && (
              <p className="auth-muted text-xs">
                Demo access: <strong>org_alpha</strong> or <strong>org_bravo</strong> / <strong>root</strong>
              </p>
            )}
            {error && <p role="alert" className="auth-error rounded-xl px-4 py-3 text-sm">{error}</p>}
            <button type="submit" disabled={busy} className="auth-submit w-full rounded-xl px-4 py-3 text-sm font-bold">
              {busy ? (mode === 'organization' ? 'Creating organization…' : 'Signing in…') : mode === 'organization' ? 'Create organization' : 'Sign in'}
            </button>
          </form>

        </div>
      </section>
    </main>
  );
}
