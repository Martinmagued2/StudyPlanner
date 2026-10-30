import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  PlugZap,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Calendar,
  Mail,
  DownloadCloud,
  ExternalLink,
  Plus,
  GitCommit as GitCommitIcon,
  Sparkles,
  CheckSquare,
  X,
  ShieldCheck,
  Check,
  FolderGit2,
  KeyRound
} from 'lucide-react';
import { IntegrationConnector } from '../../../types';
import { getGitHubToken, setGitHubToken, fetchUserRepos } from '../../../services/githubService';

export const IntegrationsView: React.FC = () => {
  const {
    integrations,
    toggleIntegrationConnection,
    syncIntegration,
    githubRepos,
    addGitHubRepo,
    addCommitBriefAsTask,
    addInboxItem,
    courses
  } = useApp();

  const [requestedName, setRequestedName] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  // Connection Setup Modal
  const [activeModalProvider, setActiveModalProvider] = useState<IntegrationConnector['provider'] | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [portalUrl, setPortalUrl] = useState('https://moodle.university.ac.uk');
  const [apiToken, setApiToken] = useState(getGitHubToken());

  // Add GitHub Repo Modal
  const [addRepoModalOpen, setAddRepoModalOpen] = useState(false);
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [repoCourseId, setRepoCourseId] = useState(courses[0]?.id || '');
  const [repoBranch, setRepoBranch] = useState('main');
  const [githubToken, setGithubTokenState] = useState(getGitHubToken());
  const [myRepos, setMyRepos] = useState<Array<{ id: number; name: string; full_name: string; owner: string; description: string; default_branch: string }>>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoErrorMsg, setRepoErrorMsg] = useState('');

  const handleOpenConnect = (provider: IntegrationConnector['provider']) => {
    setActiveModalProvider(provider);
    if (provider === 'google') setAccountEmail('student@gmail.com');
    else if (provider === 'outlook') setAccountEmail('student@uel.ac.uk');
    else if (provider === 'moodle') setPortalUrl('https://moodle.uel.ac.uk');
    else if (provider === 'github') {
      setAccountEmail('GitHub Account');
      setApiToken(getGitHubToken());
    }
  };

  const handleFetchMyRepos = async (tokenToUse?: string) => {
    setIsLoadingRepos(true);
    setRepoErrorMsg('');
    try {
      const token = tokenToUse || githubToken;
      const repos = await fetchUserRepos(token);
      setMyRepos(repos);
      if (repos.length > 0) {
        setRepoOwner(repos[0].owner);
        setRepoName(repos[0].name);
        setRepoBranch(repos[0].default_branch || 'main');
      }
    } catch (err: any) {
      setRepoErrorMsg(err?.message || 'Could not fetch repositories. Please check your GitHub token.');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleConfirmConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalProvider) return;

    if (activeModalProvider === 'github' && apiToken.trim()) {
      setGitHubToken(apiToken.trim());
      setGithubTokenState(apiToken.trim());
      handleFetchMyRepos(apiToken.trim());
    }

    // Trigger connection toggle
    toggleIntegrationConnection(activeModalProvider);

    // Auto-run first sync
    handleTriggerSync(activeModalProvider);

    setActiveModalProvider(null);
  };

  const handleTriggerSync = (provider: IntegrationConnector['provider']) => {
    setSyncingProvider(provider);
    setTimeout(() => {
      syncIntegration(provider);
      setSyncingProvider(null);
    }, 900);
  };

  const handleCreateGitHubRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoOwner.trim() || !repoName.trim()) return;

    if (githubToken.trim()) {
      setGitHubToken(githubToken.trim());
    }

    addGitHubRepo(
      repoCourseId || (courses[0]?.id ?? 'course_default'),
      repoOwner.trim(),
      repoName.trim(),
      repoBranch.trim() || 'main'
    );

    setRepoOwner('');
    setRepoName('');
    setAddRepoModalOpen(false);
  };

  const handleRequestIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedName.trim()) return;

    addInboxItem({
      title: `Integration Request: ${requestedName}`,
      content: `User requested third-party connector support for ${requestedName}.`,
      type: 'note'
    });

    setRequestSent(true);
    setRequestedName('');
    setTimeout(() => setRequestSent(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Academic Integrations & Connectors
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Sync coursework from University Moodle, external calendars from Google & Outlook, and code commits from GitHub.
          </p>
        </div>

        <button
          onClick={() => setAddRepoModalOpen(true)}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white flex items-center gap-1.5 transition-colors self-start sm:self-center shadow-xs"
        >
          <FolderGit2 className="w-3.5 h-3.5" />
          <span>Add GitHub Repository</span>
        </button>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map(conn => {
          const isSyncing = syncingProvider === conn.provider;

          return (
            <div
              key={conn.provider}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {conn.provider === 'github' && <GitBranch className="w-5 h-5 text-slate-900 dark:text-slate-100" />}
                    {conn.provider === 'google' && <Calendar className="w-5 h-5 text-blue-600" />}
                    {conn.provider === 'outlook' && <Mail className="w-5 h-5 text-sky-600" />}
                    {conn.provider === 'moodle' && <DownloadCloud className="w-5 h-5 text-amber-600" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {conn.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className={`w-2 h-2 rounded-full ${conn.connected ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                      <span>{conn.connected ? 'Connected & Active' : 'Not Connected'}</span>
                      {conn.lastSync && <span>• Last synced {conn.lastSync}</span>}
                    </div>
                  </div>
                </div>

                {conn.connected ? (
                  <button
                    onClick={() => toggleIntegrationConnection(conn.provider)}
                    className="px-3 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenConnect(conn.provider)}
                    className="px-3.5 py-1 text-xs rounded-md font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>

              {/* Connected Details & Sync Action Bar */}
              {conn.connected && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                    <span>{conn.importedCount} Imported</span>
                    <span>{conn.updatedCount} Sync cycles</span>
                    <span className="text-emerald-600">Healthy</span>
                  </div>
                  <button
                    onClick={() => handleTriggerSync(conn.provider)}
                    disabled={isSyncing}
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 font-medium disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* GitHub Course Projects & Commits Feed */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-slate-800 dark:text-slate-200" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Linked GitHub Repositories ({githubRepos.length})
            </h2>
          </div>

          <button
            onClick={() => setAddRepoModalOpen(true)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Link Repository</span>
          </button>
        </div>

        {githubRepos.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-white dark:bg-slate-900">
            <GitBranch className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No GitHub repositories linked yet
            </div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Link your coursework code repo to pull recent commits and convert commits into actionable study tasks.
            </p>
            <button
              onClick={() => setAddRepoModalOpen(true)}
              className="px-3 py-1 text-xs font-semibold rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Link First Repository
            </button>
          </div>
        ) : (
          githubRepos.map(repo => {
            const course = courses.find(c => c.id === repo.courseId);

            return (
              <div
                key={repo.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {repo.owner}/{repo.repo}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        branch: {repo.branch}
                      </span>
                      {course && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                          style={{ backgroundColor: `${course.color}20`, color: course.color }}
                        >
                          {course.code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{repo.notes}</p>
                  </div>
                </div>

                {/* Commits Feed */}
                <div className="space-y-3">
                  {repo.commits.map(commit => (
                    <div
                      key={commit.hash}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://github.com/${repo.owner}/${repo.repo}/commit/${commit.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                            title="Open commit on GitHub"
                          >
                            <span>{commit.shortHash}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{commit.message}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          <span className="text-emerald-600">+{commit.additions}</span>{' '}
                          <span className="text-rose-600">-{commit.deletions}</span>
                        </div>
                      </div>

                      {commit.aiSummary && (
                        <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>AI Commit Brief:</strong> {commit.aiSummary}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                        <span>Author: {commit.author} • {new Date(commit.date).toLocaleDateString()}</span>
                        <button
                          onClick={() => addCommitBriefAsTask(commit, repo.courseId)}
                          className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-medium flex items-center gap-1 transition-colors"
                        >
                          <CheckSquare className="w-3 h-3 text-emerald-600" />
                          <span>Convert to Course Task</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Integration Request Card */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-3 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">
          Request Unsupported Integration
        </h3>
        <p className="text-slate-500">
          Need Notion, Obsidian, Blackboard, or Brightspace? Submit a connector request directly to your workspace inbox.
        </p>
        <form onSubmit={handleRequestIntegration} className="flex gap-2 max-w-md">
          <input
            type="text"
            required
            value={requestedName}
            onChange={e => setRequestedName(e.target.value)}
            placeholder="e.g. Canvas LMS, Obsidian Vault Sync..."
            className="flex-1 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-medium hover:bg-slate-800 shrink-0"
          >
            Submit Request
          </button>
        </form>
        {requestSent && (
          <div className="text-emerald-600 text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Request captured to your Inbox!</span>
          </div>
        )}
      </div>

      {/* Connect Configuration Modal */}
      {activeModalProvider && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PlugZap className="w-4 h-4 text-slate-900 dark:text-slate-100" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 capitalize">
                  Connect {activeModalProvider} Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalProvider(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmConnect} className="space-y-3.5">
              {activeModalProvider === 'moodle' ? (
                <>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Moodle Portal URL</label>
                    <input
                      type="url"
                      required
                      value={portalUrl}
                      onChange={e => setPortalUrl(e.target.value)}
                      placeholder="https://moodle.uel.ac.uk"
                      className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Personal Security Token / API Key</label>
                    <input
                      type="password"
                      value={apiToken}
                      onChange={e => setApiToken(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </>
              ) : activeModalProvider === 'github' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">GitHub Personal Access Token (PAT)</label>
                    <input
                      type="password"
                      value={apiToken}
                      onChange={e => setApiToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Required by GitHub to pull your projects and commits. Generate one at{' '}
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        github.com/settings/tokens
                      </a>{' '}
                      with <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">repo</code> scope.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-500 font-medium mb-1">
                    Account Email
                  </label>
                  <input
                    type="text"
                    required
                    value={accountEmail}
                    onChange={e => setAccountEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              )}

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Two-Way Client Synchronization</span>
                </div>
                <p>
                  Connecting will automatically synchronize coursework, calendars, and tasks directly into your Nook local workspace.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModalProvider(null)}
                  className="px-3 py-1.5 rounded text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold hover:bg-slate-800"
                >
                  Authenticate & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add GitHub Repo Modal */}
      {addRepoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-slate-900 dark:text-slate-100" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Link GitHub Coursework Repository
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddRepoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGitHubRepo} className="space-y-3.5">
              {/* GitHub Token section */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                    <span>GitHub Personal Access Token (Key)</span>
                  </label>
                  {githubToken && (
                    <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" /> Token Saved
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={githubToken}
                    onChange={e => setGithubTokenState(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (optional for public repos)"
                    className="flex-1 p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (githubToken.trim()) setGitHubToken(githubToken.trim());
                      handleFetchMyRepos(githubToken);
                    }}
                    disabled={isLoadingRepos}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md font-semibold text-xs flex items-center gap-1.5 shrink-0"
                  >
                    {isLoadingRepos ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <DownloadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>Load My Repos</span>
                  </button>
                </div>
                {repoErrorMsg && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    {repoErrorMsg}
                  </p>
                )}
                {myRepos.length > 0 && (
                  <div className="pt-1">
                    <label className="block text-slate-500 font-medium mb-1">
                      Select From Your GitHub Repositories ({myRepos.length} found):
                    </label>
                    <select
                      onChange={e => {
                        const selected = myRepos.find(r => r.full_name === e.target.value);
                        if (selected) {
                          setRepoOwner(selected.owner);
                          setRepoName(selected.name);
                          setRepoBranch(selected.default_branch || 'main');
                        }
                      }}
                      className="w-full p-2 rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-slate-100 focus:outline-none font-semibold"
                    >
                      <option value="">-- Choose a repository to auto-fill --</option>
                      {myRepos.map(r => (
                        <option key={r.id} value={r.full_name}>
                          {r.full_name} ({r.default_branch}) {r.description ? `— ${r.description.slice(0, 40)}...` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Associated Course</label>
                <select
                  value={repoCourseId}
                  onChange={e => setRepoCourseId(e.target.value)}
                  className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Repo Owner / Org</label>
                  <input
                    type="text"
                    required
                    value={repoOwner}
                    onChange={e => setRepoOwner(e.target.value)}
                    placeholder="e.g. uel-cs or martin"
                    className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Repository Name</label>
                  <input
                    type="text"
                    required
                    value={repoName}
                    onChange={e => setRepoName(e.target.value)}
                    placeholder="e.g. data-structures"
                    className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Default Branch</label>
                <input
                  type="text"
                  value={repoBranch}
                  onChange={e => setRepoBranch(e.target.value)}
                  placeholder="main"
                  className="w-full p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddRepoModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold hover:bg-slate-800"
                >
                  Link Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
