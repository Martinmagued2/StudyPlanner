import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Lock, Mail, User, Sparkles, Moon, Sun, ArrowRight, CheckCircle2, ShieldCheck, Smartphone, RefreshCw, KeyRound } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login, loginDemo, theme, setTheme, loadFromCloud } = useApp();

  const [mode, setMode] = useState<'register' | 'login' | 'sync'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [syncCode, setSyncCode] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'sync') {
      const trimmed = syncCode.trim();
      if (!trimmed) {
        setErrorMsg('Please enter your Device Sync Code or URL.');
        return;
      }

      // If user pasted full link with ?sync=..., extract the code
      let extractedId = trimmed;
      if (trimmed.includes('sync=')) {
        const parts = trimmed.split('sync=');
        if (parts[1]) extractedId = parts[1].split('&')[0];
      }

      setIsSyncing(true);
      loadFromCloud(extractedId)
        .then(success => {
          setIsSyncing(false);
          if (!success) {
            setErrorMsg('Sync Code not found or expired. Please check the code on your laptop and try again.');
          }
        })
        .catch(err => {
          setIsSyncing(false);
          setErrorMsg('Failed to connect to cloud sync. Please check your connection.');
        });
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    // Login or Register: uses deterministic user isolation based on email
    login(email.trim(), mode === 'register' ? name.trim() : undefined);
  };

  return (
    <div className="min-h-screen w-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 relative font-sans text-slate-900 dark:text-slate-100 selection:bg-slate-200 dark:selection:bg-slate-800">
      {/* Theme Toggle in Top Right */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 items-center justify-center font-bold text-2xl shadow-sm mb-1">
            N
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Nook Study Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Academic intelligence, timetable scheduling, coursework tracking & AI study assistant.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6 sm:p-7 space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(''); }}
              className={`py-2 rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              className={`py-2 rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('sync'); setErrorMsg(''); }}
              className={`py-2 rounded-md transition-all flex items-center justify-center gap-1 ${
                mode === 'sync'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Pair Device</span>
            </button>
          </div>

          {/* Mode Descriptions */}
          {mode === 'register' && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Clean, Empty Workspace:</span> Your new account starts fresh with 0 courses and 0 coursework.
              </div>
            </div>
          )}

          {mode === 'sync' && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                <span className="font-semibold">Connect to your Laptop / Phone:</span> Open Nook on your other device, tap <strong className="underline">Sync Phone</strong> in the top bar to get your Sync Code, and paste it below.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Auth / Sync Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {mode === 'sync' ? (
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Device Sync Code or Link
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={syncCode}
                    onChange={e => setSyncCode(e.target.value)}
                    placeholder="e.g. sync_179326... or paste sync link"
                    className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Find your code on your laptop via Top Bar &gt; Sync Phone &gt; Copy Sync Code.
                </p>
              </div>
            ) : (
              <>
                {mode === 'register' && (
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Jordan Smith"
                        className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="student@university.edu"
                      className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSyncing}
              className={`w-full py-2.5 rounded-md font-semibold transition-colors mt-2 flex items-center justify-center gap-2 ${
                mode === 'sync'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white'
              }`}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting & Restoring...</span>
                </>
              ) : mode === 'sync' ? (
                <>
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Connect & Load Data</span>
                </>
              ) : mode === 'register' ? (
                'Register & Start Empty Workspace'
              ) : (
                'Sign In to Workspace'
              )}
            </button>
          </form>

          {/* Quick Access Option */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="text-[11px] text-slate-400 text-center font-medium">
              Want quick access without creating an email password?
            </div>
            <button
              type="button"
              onClick={loginDemo}
              className="w-full py-2 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 font-medium text-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Instant Guest Access (Clean Workspace)</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Footer Security Note */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center px-4">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Cross-device cloud synchronization & local client-side data isolation.</span>
        </div>
      </div>
    </div>
  );
};
