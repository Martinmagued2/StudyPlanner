// Cloud Synchronization Service for Multi-Device StudyPlanner Access
// Allows seamless real-time synchronization between Laptop, Phone, Tablet, and Desktop.

export interface CloudWorkspacePayload {
  version: string;
  syncedAt: string;
  user: any;
  courses: any[];
  assignments: any[];
  tasks: any[];
  notes: any[];
  events: any[];
  inboxItems: any[];
  files: any[];
  flashcards: any[];
  flashcardDecks: any[];
  focusSessions: any[];
  quizzes: any[];
  exams: any[];
  gradeItems: any[];
  previousTermCourses: any[];
  aiMemories: any[];
  dailyPlan: any;
  integrations: any[];
  githubRepos: any[];
  notifications: any[];
  reminderLogs: any[];
}

const BYTEBIN_API_URL = 'https://bytebin.lucko.me';

/**
 * Strips huge redundant binary strings so cloud payload is lightweight (<100KB) and lightning-fast.
 */
function sanitizePayload(payload: CloudWorkspacePayload): any {
  return {
    version: payload.version || '1.0.0',
    syncedAt: new Date().toISOString(),
    user: payload.user || null,
    courses: payload.courses || [],
    assignments: payload.assignments || [],
    tasks: payload.tasks || [],
    notes: (payload.notes || []).map(n => ({
      ...n,
      content: n.content && n.content.length > 30000 ? n.content.slice(0, 30000) : n.content
    })),
    events: payload.events || [],
    inboxItems: payload.inboxItems || [],
    files: (payload.files || []).map(f => ({
      id: f.id,
      name: f.name,
      fileType: f.fileType,
      pageCount: f.pageCount,
      sizeBytes: f.sizeBytes,
      status: f.status,
      summary: f.summary,
      // Retain chunks for all 59 slides, but limit rawText to prevent payload rejection
      chunks: (f.chunks || []).slice(0, 100),
      rawText: f.rawText && f.rawText.length > 40000 ? f.rawText.slice(0, 40000) : f.rawText
    })),
    flashcards: payload.flashcards || [],
    flashcardDecks: payload.flashcardDecks || [],
    focusSessions: payload.focusSessions || [],
    quizzes: payload.quizzes || [],
    exams: payload.exams || [],
    gradeItems: payload.gradeItems || [],
    previousTermCourses: payload.previousTermCourses || [],
    aiMemories: payload.aiMemories || [],
    dailyPlan: payload.dailyPlan || null,
    integrations: payload.integrations || [],
    githubRepos: payload.githubRepos || [],
    notifications: (payload.notifications || []).slice(0, 20),
    reminderLogs: (payload.reminderLogs || []).slice(0, 20)
  };
}

/**
 * Uploads workspace snapshot to free, high-performance cloud storage (Bytebin) with full CORS.
 * Returns the short cloud object key (Sync ID).
 */
export async function uploadToCloud(
  payload: CloudWorkspacePayload,
  _existingSyncId?: string | null
): Promise<{ syncId: string; syncedAt: string }> {
  const syncedAt = new Date().toISOString();
  const cleanData = sanitizePayload(payload);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const postRes = await fetch(`${BYTEBIN_API_URL}/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cleanData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!postRes.ok) {
      throw new Error(`Cloud upload status ${postRes.status}`);
    }

    const result = await postRes.json();
    if (!result?.key) {
      throw new Error('Cloud did not return a valid sync key');
    }

    return { syncId: result.key, syncedAt };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('Cloud upload error:', err);
    throw err;
  }
}

/**
 * Fetches workspace data from cloud using the Sync ID.
 */
export async function fetchFromCloud(syncId: string): Promise<CloudWorkspacePayload> {
  const cleanId = syncId.trim();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(`${BYTEBIN_API_URL}/${cleanId}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      // Legacy fallback for old 32-char IDs
      if (cleanId.length > 20) {
        try {
          const oldRes = await fetch(`https://api.restful-api.dev/objects/${cleanId}`);
          if (oldRes.ok) {
            const oldJson = await oldRes.json();
            return (oldJson.data?.payload ? JSON.parse(oldJson.data.payload) : oldJson.data) as CloudWorkspacePayload;
          }
        } catch {}
      }
      throw new Error(`Could not find cloud workspace with Sync ID "${cleanId}". (Status ${res.status})`);
    }

    const data = await res.json();
    if (!data) {
      throw new Error('Cloud workspace data is empty or invalid.');
    }

    return data as CloudWorkspacePayload;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Generates an easy-to-share URL with embedded sync parameter for phone/tablet.
 */
export function getShareableSyncUrl(syncId: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?sync=${encodeURIComponent(syncId.trim())}`;
}
