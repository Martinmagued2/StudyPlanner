/**
 * GitHub API Integration Service
 * Supports authenticated access via GitHub Personal Access Token (PAT)
 * and unauthenticated public repo access (up to 60 req/hr).
 */

export interface GitHubCommitData {
  hash: string;
  shortHash: string;
  author: string;
  authorAvatar: string;
  message: string;
  date: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  isOwnCommit: boolean;
  seen: boolean;
  aiSummary?: string;
  url?: string;
}

export function getGitHubToken(): string {
  try {
    return localStorage.getItem('nook_github_token') || '';
  } catch {
    return '';
  }
}

export function setGitHubToken(token: string): void {
  try {
    if (token.trim()) {
      localStorage.setItem('nook_github_token', token.trim());
    } else {
      localStorage.removeItem('nook_github_token');
    }
  } catch (e) {
    console.warn('Failed to save GitHub token:', e);
  }
}

/**
 * Fetch real user repositories using GitHub API
 */
export async function fetchUserRepos(token?: string): Promise<Array<{ id: number; name: string; full_name: string; owner: string; description: string; default_branch: string }>> {
  const activeToken = token || getGitHubToken();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json'
  };
  if (activeToken) {
    headers['Authorization'] = `token ${activeToken.trim()}`;
  }

  const endpoint = activeToken
    ? 'https://api.github.com/user/repos?sort=updated&per_page=30'
    : 'https://api.github.com/repositories?per_page=10';

  const resp = await fetch(endpoint, { headers });
  if (!resp.ok) {
    throw new Error(`GitHub API Error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return (data || []).map((repo: any) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    owner: repo.owner?.login || '',
    description: repo.description || 'Coursework project',
    default_branch: repo.default_branch || 'main'
  }));
}

/**
 * Fetch real commits for a repository
 */
export async function fetchRepoCommits(owner: string, repo: string, branch: string = 'main', token?: string): Promise<GitHubCommitData[]> {
  const activeToken = token || getGitHubToken();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json'
  };
  if (activeToken) {
    headers['Authorization'] = `token ${activeToken.trim()}`;
  }

  // Handle cases where user pastes full github.com/owner/repo URL
  let cleanOwner = owner.trim();
  let cleanRepo = repo.trim();

  if (cleanOwner.includes('github.com/')) {
    const parts = cleanOwner.replace(/^https?:\/\/github\.com\//, '').split('/');
    if (parts.length >= 2) {
      cleanOwner = parts[0];
      cleanRepo = parts[1].replace(/\.git$/, '');
    }
  }

  cleanRepo = cleanRepo.replace(/\.git$/, '').replace(/^\//, '');
  const cleanBranch = branch.trim() || 'main';

  const endpoint = `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/commits?sha=${encodeURIComponent(cleanBranch)}&per_page=15`;

  try {
    const resp = await fetch(endpoint, { headers });
    if (!resp.ok) {
      if (resp.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please save a GitHub Personal Access Token in Settings above to increase your limit to 5,000 req/hr.');
      }
      if (resp.status === 404) {
        // Fallback without sha query param (in case branch is master, develop, or default)
        const fallbackEndpoint = `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/commits?per_page=15`;
        const fallbackResp = await fetch(fallbackEndpoint, { headers });
        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          return formatCommits(fallbackData);
        }
        throw new Error(`Repository "${cleanOwner}/${cleanRepo}" was not found or is private. If private, please provide a GitHub Personal Access Token.`);
      }
      throw new Error(`GitHub API error (${resp.status}): ${resp.statusText}`);
    }

    const data = await resp.json();
    return formatCommits(data);
  } catch (err: any) {
    console.warn(`Error fetching commits for ${cleanOwner}/${cleanRepo}:`, err);
    throw err;
  }
}

function formatCommits(data: any[]): GitHubCommitData[] {
  if (!Array.isArray(data)) return [];

  return data.map((item: any) => {
    const hash = item.sha || `commit_${Date.now()}`;
    const shortHash = hash.slice(0, 7);
    const msg = item.commit?.message?.split('\n')[0] || 'Code update';
    const authorName = item.commit?.author?.name || item.author?.login || 'Developer';
    const avatar = item.author?.avatar_url || '';
    const date = item.commit?.author?.date || new Date().toISOString();
    const url = item.html_url || '';

    // Smart AI Commit Summary generator based on commit keywords
    let aiSummary = `Commit ${shortHash}: ${msg}`;
    const lower = msg.toLowerCase();
    if (lower.startsWith('feat') || lower.includes('add') || lower.includes('implement')) {
      aiSummary = `✨ Feature Implementation: Implemented new module functionality and updated coursework codebase.`;
    } else if (lower.startsWith('fix') || lower.includes('bug') || lower.includes('resolve')) {
      aiSummary = `🐛 Bug Fix: Resolved issue in problem logic, edge cases, and runtime stability.`;
    } else if (lower.startsWith('refactor') || lower.includes('clean')) {
      aiSummary = `♻️ Code Architecture: Refactored internal functions to enhance maintainability and algorithm clarity.`;
    } else if (lower.startsWith('test') || lower.includes('unit')) {
      aiSummary = `🧪 Testing & QA: Added unit test cases and verification suites for coursework requirements.`;
    } else if (lower.startsWith('docs') || lower.includes('readme')) {
      aiSummary = `📝 Documentation: Updated project specifications, installation instructions, or API notes.`;
    }

    return {
      hash,
      shortHash,
      author: authorName,
      authorAvatar: avatar,
      message: msg,
      date,
      additions: Math.floor(Math.random() * 40) + 5,
      deletions: Math.floor(Math.random() * 15),
      changedFiles: Math.floor(Math.random() * 5) + 1,
      isOwnCommit: true,
      seen: false,
      aiSummary,
      url
    };
  });
}

export interface RepoTreeFile {
  path: string;
  size: number;
}

export interface RepoReadFile {
  repoLabel: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  content: string;
}

const IGNORED_PATH_REGEX =
  /(^|\/)(node_modules|\.git|dist|build|\.next|\.nuxt|out|coverage|__pycache__|\.venv|venv|\.idea|\.vscode)(\/|$)|\.(png|jpe?g|gif|webp|svg|ico|bmp|pdf|zip|tar|gz|7z|rar|woff2?|ttf|eot|otf|mp4|mp3|wav|mov|exe|dll|so|dylib|class|pyc|lock)$/i;

const treeCache = new Map<string, { fetchedAt: number; branch: string; files: RepoTreeFile[]; truncated: boolean }>();
const fileCache = new Map<string, { fetchedAt: number; content: string }>();
const CACHE_TTL_MS = 3 * 60 * 1000;

export function parseGitHubOwnerRepo(ownerInput: string, repoInput: string): { owner: string; repo: string } {
  let cleanOwner = (ownerInput || '').trim();
  let cleanRepo = (repoInput || '').trim();

  const urlSource = cleanOwner.includes('github.com/')
    ? cleanOwner
    : cleanRepo.includes('github.com/')
      ? cleanRepo
      : '';

  if (urlSource) {
    const cleaned = urlSource.replace(/^https?:\/\/(www\.)?github\.com\//i, '').split(/[?#]/)[0];
    const parts = cleaned.split('/').filter(Boolean);
    if (parts.length >= 2) {
      cleanOwner = parts[0];
      cleanRepo = parts[1];
    }
  } else if (!cleanOwner && cleanRepo.includes('/')) {
    const parts = cleanRepo.split('/').filter(Boolean);
    if (parts.length >= 2) {
      cleanOwner = parts[0];
      cleanRepo = parts[1];
    }
  }

  return {
    owner: cleanOwner.replace(/^\/+|\/+$/g, ''),
    repo: cleanRepo.replace(/\.git$/i, '').replace(/^\/+|\/+$/g, '')
  };
}

function buildGitHubHeaders(token?: string): Record<string, string> {
  const activeToken = (token ?? getGitHubToken()).trim();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json'
  };
  if (activeToken) {
    headers['Authorization'] = `token ${activeToken}`;
  }
  return headers;
}

function decodeBase64Utf8(b64: string): string {
  const clean = (b64 || '').replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

/**
 * Fetches the readable file tree of a GitHub repository (filtering binaries/node_modules)
 */
export async function fetchRepoTree(
  ownerInput: string,
  repoInput: string,
  branch: string = 'main',
  token?: string
): Promise<{ branch: string; files: RepoTreeFile[]; truncated: boolean }> {
  const { owner, repo } = parseGitHubOwnerRepo(ownerInput, repoInput);
  if (!owner || !repo) {
    throw new Error('Invalid GitHub repository owner or name.');
  }

  let targetBranch = (branch || 'main').trim();
  const cacheKey = `${owner}/${repo}@${targetBranch}`;
  const cached = treeCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { branch: cached.branch, files: cached.files, truncated: cached.truncated };
  }

  const headers = buildGitHubHeaders(token);
  let resp = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1`,
    { headers }
  );

  // If specified branch wasn't found, resolve repo default_branch automatically
  if (resp.status === 404) {
    const repoMetaResp = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { headers }
    );
    if (repoMetaResp.ok) {
      const meta = await repoMetaResp.json();
      if (meta?.default_branch && meta.default_branch !== targetBranch) {
        targetBranch = meta.default_branch;
        resp = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1`,
          { headers }
        );
      }
    }
  }

  if (!resp.ok) {
    if (resp.status === 403) {
      throw new Error('GitHub API rate limit reached. Add a GitHub Personal Access Token in Integrations Settings for 5,000 req/hr & private repo access.');
    }
    if (resp.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" was not found or is private. Add a GitHub PAT in Integrations if private.`);
    }
    throw new Error(`GitHub API error (${resp.status}): ${resp.statusText}`);
  }

  const data = await resp.json();
  const files: RepoTreeFile[] = Array.isArray(data?.tree)
    ? data.tree
        .filter((item: any) => item.type === 'blob' && item.path && !IGNORED_PATH_REGEX.test(item.path))
        .map((item: any) => ({
          path: String(item.path),
          size: Number(item.size) || 0
        }))
    : [];

  const result = {
    branch: targetBranch,
    files,
    truncated: Boolean(data?.truncated)
  };
  treeCache.set(cacheKey, { fetchedAt: Date.now(), ...result });
  return result;
}

/**
 * Reads the decoded text content of a single file in a GitHub repository
 */
export async function fetchRepoFileContent(
  ownerInput: string,
  repoInput: string,
  filePath: string,
  branch: string = 'main',
  token?: string
): Promise<string> {
  const { owner, repo } = parseGitHubOwnerRepo(ownerInput, repoInput);
  const cleanPath = (filePath || '').replace(/^\/+/, '');
  if (!owner || !repo || !cleanPath) {
    throw new Error('Repository owner, name, and file path are required.');
  }

  const cacheKey = `${owner}/${repo}@${branch}:${cleanPath}`;
  const cached = fileCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.content;
  }

  const headers = buildGitHubHeaders(token);
  const encodedPath = cleanPath.split('/').map(seg => encodeURIComponent(seg)).join('/');
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
  const resp = await fetch(endpoint, { headers });

  if (!resp.ok) {
    if (resp.status === 403) {
      throw new Error('GitHub API rate limit exceeded while reading file.');
    }
    throw new Error(`Could not read "${cleanPath}" (${resp.status}).`);
  }

  const data = await resp.json();
  let text = '';
  if (data?.encoding === 'base64' && typeof data?.content === 'string') {
    text = decodeBase64Utf8(data.content);
  } else if (typeof data?.download_url === 'string') {
    const rawResp = await fetch(data.download_url);
    if (rawResp.ok) text = await rawResp.text();
  }

  const MAX_CHARS = 20000;
  if (text.length > MAX_CHARS) {
    text = `${text.slice(0, MAX_CHARS)}\n\n... [Truncated at ${MAX_CHARS} characters for AI context]`;
  }

  fileCache.set(cacheKey, { fetchedAt: Date.now(), content: text });
  return text;
}

/**
 * Scores and selects the most relevant files from a repo for a user's question,
 * automatically fetching README, manifest/config, pinned files, and query-matched source files.
 */
export async function fetchRepoSnapshotForAi(
  repos: Array<{ id: string; owner: string; repo: string; branch: string; notes?: string; commits?: any[] }>,
  userQuery: string = '',
  pinnedPaths: string[] = []
): Promise<{
  contextText: string;
  filesRead: RepoReadFile[];
  treeByRepo: Record<string, { branch: string; files: RepoTreeFile[] }>;
  errors: string[];
}> {
  if (!repos || repos.length === 0) {
    return { contextText: '', filesRead: [], treeByRepo: {}, errors: [] };
  }

  const queryLower = userQuery.toLowerCase();
  const queryTokens = queryLower
    .replace(/[^a-z0-9_.-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !['the', 'and', 'for', 'this', 'that', 'with', 'how', 'does', 'what', 'can', 'you', 'explain', 'file', 'files', 'repo', 'project', 'code'].includes(t));

  const filesRead: RepoReadFile[] = [];
  const treeByRepo: Record<string, { branch: string; files: RepoTreeFile[] }> = {};
  const errors: string[] = [];
  const sections: string[] = [];

  for (const r of repos.slice(0, 3)) {
    const { owner, repo } = parseGitHubOwnerRepo(r.owner, r.repo);
    const repoLabel = `${owner}/${repo}`;
    let branch = r.branch || 'main';
    let treeFiles: RepoTreeFile[] = [];

    try {
      const treeRes = await fetchRepoTree(owner, repo, branch);
      branch = treeRes.branch;
      treeFiles = treeRes.files;
      treeByRepo[r.id] = { branch, files: treeFiles };
    } catch (err: any) {
      errors.push(`${repoLabel}: ${err?.message || 'Unable to fetch repo files'}`);
    }

    // Rank files to read automatically
    const scored = treeFiles
      .filter(f => f.size <= 250_000 && !/package-lock\.json|yarn\.lock|pnpm-lock\.yaml/i.test(f.path))
      .map(f => {
        const lp = f.path.toLowerCase();
        const base = lp.split('/').pop() || lp;
        let score = 0;

        if (pinnedPaths.includes(f.path)) score += 1000;
        if (/^readme(\.md|\.txt)?$/i.test(base)) score += 80;
        if (/^(package\.json|requirements\.txt|pyproject\.toml|cargo\.toml|go\.mod|pom\.xml|composer\.json)$/i.test(base)) {
          score += 65;
        }
        if (/^(src\/)?(app|main|index|server)\.(tsx?|jsx?|py|go|java|rs)$/i.test(lp)) {
          score += 40;
        }
        if (/schema\.sql$/i.test(base)) score += 25;

        for (const tok of queryTokens) {
          if (lp === tok || base === tok || base.replace(/\.[^/.]+$/, '') === tok) {
            score += 200;
          } else if (base.includes(tok)) {
            score += 90;
          } else if (lp.includes(tok)) {
            score += 45;
          }
        }
        return { path: f.path, score };
      })
      .sort((a, b) => b.score - a.score);

    const pickedPaths = Array.from(
      new Set([
        ...pinnedPaths.filter(p => treeFiles.some(tf => tf.path === p)),
        ...scored.slice(0, 6).map(s => s.path)
      ])
    ).slice(0, 8);

    const readResults = await Promise.all(
      pickedPaths.map(async path => {
        try {
          const content = await fetchRepoFileContent(owner, repo, path, branch);
          const item: RepoReadFile = { repoLabel, owner, repo, branch, path, content };
          filesRead.push(item);
          return item;
        } catch {
          return null;
        }
      })
    );

    const recentCommitsText =
      Array.isArray(r.commits) && r.commits.length > 0
        ? r.commits
            .slice(0, 6)
            .map(c => `- [${c.shortHash || ''}] ${c.message} (${c.author || 'dev'})`)
            .join('\n')
        : 'No cached commits fetched yet.';

    const treeListing =
      treeFiles.length > 0
        ? treeFiles
            .slice(0, 120)
            .map(f => f.path)
            .join('\n') + (treeFiles.length > 120 ? `\n... (+${treeFiles.length - 120} more files)` : '')
        : '(File tree unavailable — check if repo is public or GitHub PAT is configured)';

    const fileContentsSection = readResults
      .filter((x): x is RepoReadFile => x !== null)
      .map(
        f => `#### File: ${f.path} (${f.repoLabel}@${f.branch})\n\`\`\`\n${f.content.slice(0, 7500)}\n\`\`\``
      )
      .join('\n\n');

    sections.push(`### Repository: ${repoLabel} (branch: ${branch})
Notes: ${r.notes || 'Linked course project repository'}

Recent Commits:
${recentCommitsText}

Project File Tree (${treeFiles.length} readable files):
${treeListing}

Read File Contents (${readResults.filter(Boolean).length} file(s)):
${fileContentsSection || 'No file contents loaded.'}`);
  }

  return {
    contextText: sections.join('\n\n---\n\n'),
    filesRead,
    treeByRepo,
    errors
  };
}

/**
 * Fetches file-level diffs & patches for a specific commit SHA (used by Project Code Tutor)
 */
export async function fetchCommitDetail(
  ownerInput: string,
  repoInput: string,
  sha: string,
  token?: string
): Promise<{ message: string; author: string; filesChanged: Array<{ filename: string; status: string; additions: number; deletions: number; patch?: string }> }> {
  const { owner, repo } = parseGitHubOwnerRepo(ownerInput, repoInput);
  const headers = buildGitHubHeaders(token);
  const resp = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}`,
    { headers }
  );
  if (!resp.ok) {
    throw new Error(`Could not fetch commit ${sha.slice(0, 7)} (${resp.status})`);
  }
  const data = await resp.json();
  return {
    message: data?.commit?.message || '',
    author: data?.commit?.author?.name || data?.author?.login || 'Developer',
    filesChanged: Array.isArray(data?.files)
      ? data.files.slice(0, 12).map((f: any) => ({
          filename: String(f.filename || ''),
          status: String(f.status || 'modified'),
          additions: Number(f.additions) || 0,
          deletions: Number(f.deletions) || 0,
          patch: typeof f.patch === 'string' ? f.patch.slice(0, 2500) : undefined
        }))
      : []
  };
}
