import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { Lock, Mail, User, Sparkles, Moon, Sun, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login, loginDemo, theme, setTheme } = useApp();

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    // Login or Register: will create a clean, 100% empty workspace for this new account
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
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(''); }}
              className={`py-2 rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Create Account (Register)
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
          </div>

          {/* New Account Guarantee Badge */}
          {mode === 'register' && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Clean, Empty Workspace:</span> Your new account starts fresh with 0 courses and 0 coursework. Use the <strong className="text-slate-900 dark:text-slate-100">Ask AI</strong> button or manual forms to add what you need.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
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

            <button
              type="submit"
              className="w-full py-2.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors mt-2"
            >
              {mode === 'register' ? 'Register & Start Empty Workspace' : 'Sign In to Workspace'}
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
              <span>Instant Guest Access (100% Fresh Clean Workspace)</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Footer Security Note */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
          <span>Local client-side account isolation & data persistence.</span>
        </div>
      </div>
    </div>
  );
};
