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

const CLOUD_API_URL = 'https://api.restful-api.dev/objects';

/**
 * Uploads workspace snapshot to free cloud storage and returns the cloud object ID (Sync ID).
 * If an existing syncId is provided, it updates the existing cloud record (PUT).
 * If no syncId is provided, it creates a new cloud record (POST).
 */
export async function uploadToCloud(
  payload: CloudWorkspacePayload,
  existingSyncId?: string | null
): Promise<{ syncId: string; syncedAt: string }> {
  const syncedAt = new Date().toISOString();
  const serialized = JSON.stringify({ ...payload, syncedAt });

  const bodyData = {
    name: 'nook_studyplanner_workspace',
    data: {
      payload: serialized,
      syncedAt,
      userEmail: payload.user?.email || 'anonymous',
      userName: payload.user?.name || 'Student'
    }
  };

  if (existingSyncId && existingSyncId.trim().length > 5) {
    try {
      const putRes = await fetch(`${CLOUD_API_URL}/${existingSyncId.trim()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      if (putRes.ok) {
        return { syncId: existingSyncId.trim(), syncedAt };
      }
    } catch (e) {
      console.warn('Failed to update existing cloud sync object, falling back to create:', e);
    }
  }

  // Create new cloud object
  const postRes = await fetch(CLOUD_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyData)
  });

  if (!postRes.ok) {
    throw new Error(`Cloud upload failed with status ${postRes.status}`);
  }

  const result = await postRes.json();
  return { syncId: result.id, syncedAt };
}

/**
 * Fetches workspace data from cloud using the Sync ID.
 */
export async function fetchFromCloud(syncId: string): Promise<CloudWorkspacePayload> {
  const cleanId = syncId.trim();
  const res = await fetch(`${CLOUD_API_URL}/${cleanId}`);
  if (!res.ok) {
    throw new Error(`Could not find cloud workspace with Sync ID "${cleanId}". (Status ${res.status})`);
  }

  const json = await res.json();
  if (!json?.data?.payload) {
    throw new Error('Cloud workspace data is empty or invalid.');
  }

  const parsed = JSON.parse(json.data.payload) as CloudWorkspacePayload;
  return parsed;
}

/**
 * Generates an easy-to-share URL with embedded sync parameter for phone/tablet.
 */
export function getShareableSyncUrl(syncId: string): string {
  const base = window.location.origin + window.location.pathname;
  return `${base}?sync=${encodeURIComponent(syncId.trim())}`;
}
