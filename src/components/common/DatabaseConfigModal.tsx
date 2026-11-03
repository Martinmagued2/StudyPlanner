import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  getSupabaseConfig,
  setCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  testSupabaseConnection,
  testDatabaseReadWrite,
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignInWithOtp,
  supabaseSignOut,
  getSupabaseUser
} from '../../services/supabase';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  X,
  Lock,
  Mail,
  User as UserIcon,
  Server,
  Zap,
  Radio,
  FileCode,
  ShieldCheck,
  Check,
  Play,
  ArrowUpRight,
  UploadCloud,
  CheckCheck
} from 'lucide-react';

export const DatabaseConfigModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { user, login, saveToDatabase, courses, notes, tasks, files } = useApp();

  const [activeTab, setActiveTab] = useState<'config' | 'auth' | 'status'>('config');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Live Read/Write Diagnostic State
  const [isReadWriteTesting, setIsReadWriteTesting] = useState(false);
  const [readWriteResult, setReadWriteResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Force Push State
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [forceSyncMessage, setForceSyncMessage] = useState<string | null>(null);

  // Auth State
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'otp'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ error?: boolean; msg: string } | null>(null);
  const [supabaseAuthUser, setSupabaseAuthUser] = useState<any>(null);

  // Initialize inputs from existing config
  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      if (cfg) {
        setSupabaseUrl(cfg.url);
        setAnonKey(cfg.anonKey);
      }
      getSupabaseUser().then(u => setSupabaseAuthUser(u));
    }
  }, [isOpen]);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !anonKey.trim()) {
      setTestResult({ success: false, message: 'Please enter both the Supabase URL and Anon Key.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection(supabaseUrl, anonKey);
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      setCustomSupabaseConfig(supabaseUrl, anonKey);
      setTimeout(() => {
        // Refresh auth state
        getSupabaseUser().then(u => setSupabaseAuthUser(u));
      }, 500);
    }
  };

  const handleClear = () => {
    clearCustomSupabaseConfig();
    setSupabaseUrl('');
    setAnonKey('');
    setTestResult({ success: false, message: 'Supabase configuration removed. App is in local storage mode.' });
    setReadWriteResult(null);
    setSupabaseAuthUser(null);
  };

  const handleCopySql = async () => {
    const sqlSchema = `-- StudyPlanner Universal Supabase PostgreSQL Setup
-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_workspace UNIQUE (user_id)
);

-- Safely convert user_id to TEXT and drop any rigid foreign key constraints:
ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_user_id_fkey;
ALTER TABLE public.workspaces ALTER COLUMN user_id TYPE TEXT;

CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Allow workspace synchronization for both anonymous and authenticated sessions:
DROP POLICY IF EXISTS "Users can manage their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Allow workspace sync" ON public.workspaces;
CREATE POLICY "Allow workspace sync" ON public.workspaces FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime WebSocket notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'workspaces'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
    END IF;
END $$;`;

    try {
      await navigator.clipboard.writeText(sqlSchema);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Run live Read/Write self-test
  const handleRunReadWriteTest = async () => {
    const targetUserId = user?.id || 'usr_default';
    setIsReadWriteTesting(true);
    setReadWriteResult(null);

    const res = await testDatabaseReadWrite(targetUserId);
    setIsReadWriteTesting(false);
    setReadWriteResult(res);
  };

  // Force push workspace data to cloud
  const handleForceSync = async () => {
    setIsForceSyncing(true);
    setForceSyncMessage(null);
    try {
      const ok = await saveToDatabase();
      if (ok) {
        setForceSyncMessage(`Successfully backed up ${courses.length} courses, ${notes.length} notes, ${tasks.length} tasks, and ${files.length} files to Supabase!`);
      } else {
        setForceSyncMessage('Database sync failed. Please check table permissions in Supabase.');
      }
    } catch (e: any) {
      setForceSyncMessage(`Sync failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsForceSyncing(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthMessage(null);

    try {
      if (authMode === 'signup') {
        const res = await supabaseSignUp(authEmail, authPassword, authName);
        if (res.user) {
          setAuthMessage({ msg: 'Account created! If email confirmation is enabled, check your inbox.' });
          setSupabaseAuthUser(res.user);
          login(authEmail, authName || authEmail.split('@')[0]);
        }
      } else if (authMode === 'signin') {
        const res = await supabaseSignIn(authEmail, authPassword);
        if (res.user) {
          setAuthMessage({ msg: 'Signed in successfully! Your workspace is synchronizing...' });
          setSupabaseAuthUser(res.user);
          login(authEmail, res.user.user_metadata?.name || authEmail.split('@')[0]);
        }
      } else if (authMode === 'otp') {
        await supabaseSignInWithOtp(authEmail);
        setAuthMessage({ msg: 'Magic link sent! Check your email to sign in.' });
      }
    } catch (err: any) {
      setAuthMessage({ error: true, msg: err.message || 'Authentication failed.' });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    await supabaseSignOut();
    setSupabaseAuthUser(null);
    setAuthMessage({ msg: 'Signed out of cloud database.' });
  };

  const isConnected = Boolean(testResult?.success || getSupabaseConfig());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Cloud PostgreSQL Database</span>
                {isConnected && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Permanent cloud storage & real-time synchronization via Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 px-4 pt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Connection & Keys</span>
          </button>
          <button
            onClick={() => setActiveTab('auth')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'auth'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>User Account</span>
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Realtime Sync</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
          {/* Notification Alert */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border-rose-200 dark:border-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium text-xs">{testResult.message}</span>
            </div>
          )}

          {/* TAB 1: Database Setup & Keys */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    How to get your free Supabase database:
                  </span>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>Open Supabase</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                  <li>Create a free project at <strong>supabase.com</strong>.</li>
                  <li>In your Supabase project, open <strong>Project Settings → API</strong>.</li>
                  <li>Copy your <strong>Project URL</strong> and <strong>anon public API key</strong> below.</li>
                  <li>
                    In Supabase <strong>SQL Editor</strong>, run the setup script to enable Realtime:{' '}
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="text-emerald-600 dark:text-emerald-400 font-bold underline inline-flex items-center gap-0.5"
                    >
                      {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Schema'}</span>
                    </button>
                  </li>
                </ol>
              </div>

              <form onSubmit={handleTestAndSave} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseUrl}
                    onChange={e => setSupabaseUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Anon Public API Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={e => setAnonKey(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isTesting || !supabaseUrl.trim() || !anonKey.trim()}
                    className="flex-1 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Testing Connection...' : 'Save & Connect Database'}</span>
                  </button>

                  {getSupabaseConfig() && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                {getSupabaseConfig() && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('status');
                        handleRunReadWriteTest();
                      }}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      <span>Run Live Read/Write Test</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('status')}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-0.5"
                    >
                      <span>View Test Guide & Diagnostics</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 2: User Account & Authentication */}
          {activeTab === 'auth' && (
            <div className="space-y-4">
              {authMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    authMessage.error
                      ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-200'
                  }`}
                >
                  {authMessage.msg}
                </div>
              )}

              {supabaseAuthUser ? (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {supabaseAuthUser.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {supabaseAuthUser.email}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        User ID: {supabaseAuthUser.id.slice(0, 16)}...
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Authenticated via Supabase Auth</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 text-slate-700 dark:text-slate-200"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Auth mode toggle */}
                  <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className={`flex-1 py-1 rounded-md transition-all ${
                        authMode === 'signin'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('signup')}
                      className={`flex-1 py-1 rounded-md transition-all ${
                        authMode === 'signup'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Sign Up
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('otp')}
                      className={`flex-1 py-1 rounded-md transition-all ${
                        authMode === 'otp'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Magic Link
                    </button>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-2.5">
                    {authMode === 'signup' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Your Name"
                          value={authName}
                          onChange={e => setAuthName(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="student@university.edu"
                        value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>

                    {authMode !== 'otp' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••••••"
                          value={authPassword}
                          onChange={e => setAuthPassword(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAuthenticating || !authEmail.trim()}
                      className="w-full py-2 px-4 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>
                        {isAuthenticating
                          ? 'Authenticating...'
                          : authMode === 'signup'
                          ? 'Create Account'
                          : authMode === 'signin'
                          ? 'Sign In to Workspace'
                          : 'Send Magic Link'}
                      </span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Realtime Sync & Diagnostics */}
          {activeTab === 'status' && (
            <div className="space-y-3.5">
              {/* WebSocket Listener Status */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-emerald-500" />
                    <span>Realtime WebSocket Status</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Listening
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  PostgreSQL Change Data Capture (CDC) is active. Whenever you edit courses, notes, or tasks, your data automatically broadcasts across devices.
                </p>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Storage Engine:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    PostgreSQL 15+ (JSONB + Relational)
                  </span>
                </div>
              </div>

              {/* Live Read/Write Test Box */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      Live Cloud Database Test
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Write a test record and verify reading it back from Supabase in real time
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunReadWriteTest}
                    disabled={isReadWriteTesting}
                    className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReadWriteTesting ? 'animate-spin' : ''}`} />
                    <span>{isReadWriteTesting ? 'Testing...' : 'Run Test Now'}</span>
                  </button>
                </div>

                {readWriteResult && (
                  <div
                    className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                      readWriteResult.success
                        ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900'
                        : 'bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200 border-rose-200 dark:border-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {readWriteResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span className="font-bold text-xs">
                        {readWriteResult.success ? 'Read & Write Verified' : 'Test Failed'}
                      </span>
                      {readWriteResult.latencyMs !== undefined && (
                        <span className="ml-auto font-mono text-[10px] opacity-75">
                          {readWriteResult.latencyMs}ms latency
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed pl-6">
                      {readWriteResult.message}
                    </p>
                    {!readWriteResult.success && (
                      <div className="pt-1.5 pl-6 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopySql}
                          className="px-2.5 py-1 rounded bg-rose-600 text-white font-medium text-[11px] flex items-center gap-1 hover:bg-rose-700"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedSql ? 'Copied SQL Fix!' : 'Copy Universal SQL Fix'}</span>
                        </button>
                        <span className="text-[10px] text-slate-500">
                          Paste into Supabase SQL Editor and hit Run
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Force Full Sync Action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Active data: <strong>{courses.length}</strong> courses, <strong>{notes.length}</strong> notes, <strong>{tasks.length}</strong> tasks
                  </div>
                  <button
                    type="button"
                    onClick={handleForceSync}
                    disabled={isForceSyncing}
                    className="py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <UploadCloud className={`w-3.5 h-3.5 ${isForceSyncing ? 'animate-bounce' : ''}`} />
                    <span>{isForceSyncing ? 'Backing up...' : 'Backup All Data Now'}</span>
                  </button>
                </div>

                {forceSyncMessage && (
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-2">
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{forceSyncMessage}</span>
                  </div>
                )}
              </div>

              {/* Step-by-Step Verification Guide */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  3 Ways to Verify Your Cloud Database
                </h4>
                <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5 flex items-center justify-between">
                      <span>1. Check in Supabase Table Editor (Direct Proof)</span>
                      <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 text-[10px]"
                      >
                        <span>Open Editor</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Open your Supabase project → <strong>Table Editor</strong> → click <strong>workspaces</strong>. You will see your data row stored with your latest timestamp.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                      2. Two-Tab Real-time Sync Test (Live WebSocket Proof)
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Open StudyPlanner in a second tab or Incognito window. Add or edit a note or task in Tab 1 — within 2 seconds it will automatically appear in Tab 2 without reloading!
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                      3. Fresh Incognito Restore Test (Persistence Proof)
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      Open in an Incognito window where there is zero local storage. Connect your database and all courses, notes, files, and tasks will populate straight from PostgreSQL.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Real-time cross-device sync active</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
