import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { Flashcard, Note, Quiz } from '../types';

export type SharedItemType = 'note' | 'quiz' | 'deck';

export interface SharedStudyPayload {
  id: string;
  itemType: SharedItemType;
  title: string;
  authorName: string;
  courseLabel?: string;
  createdAt: string;
  note?: Pick<Note, 'title' | 'content' | 'blocks' | 'icon' | 'coverImage' | 'tags'>;
  quiz?: Pick<Quiz, 'title' | 'difficulty' | 'questions'>;
  deck?: {
    name: string;
    tag?: string;
    cards: Array<Pick<Flashcard, 'question' | 'answer' | 'citation'>>;
  };
}

function encodePortablePayload(payload: SharedStudyPayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePortablePayload(token: string): SharedStudyPayload | null {
  try {
    const clean = token.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (parsed && parsed.itemType && parsed.title) return parsed as SharedStudyPayload;
    return null;
  } catch {
    return null;
  }
}

export async function createSharedStudyLink(params: {
  itemType: SharedItemType;
  title: string;
  authorName: string;
  courseLabel?: string;
  note?: SharedStudyPayload['note'];
  quiz?: SharedStudyPayload['quiz'];
  deck?: SharedStudyPayload['deck'];
}): Promise<{ shareId: string; shareUrl: string; storedInCloud: boolean }> {
  const shareId = `sh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const payload: SharedStudyPayload = {
    id: shareId,
    itemType: params.itemType,
    title: params.title,
    authorName: params.authorName || 'Classmate',
    courseLabel: params.courseLabel,
    createdAt: new Date().toISOString(),
    note: params.note,
    quiz: params.quiz,
    deck: params.deck
  };

  let storedInCloud = false;
  const client = getSupabaseClient();
  if (client && isSupabaseConfigured()) {
    try {
      const { error } = await client.from('shared_items').upsert({
        id: shareId,
        item_type: params.itemType,
        title: params.title,
        author_name: params.authorName || 'Classmate',
        payload,
        created_at: payload.createdAt
      });
      if (!error) storedInCloud = true;
    } catch {
      storedInCloud = false;
    }
  }

  // Always cache locally too
  try {
    localStorage.setItem(`nook_shared_${shareId}`, JSON.stringify(payload));
  } catch { }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://studyplanner.vercel.app';
  const shareUrl = storedInCloud
    ? `${origin}/?share=${encodeURIComponent(shareId)}`
    : `${origin}/?shareData=${encodePortablePayload(payload)}`;

  return { shareId, shareUrl, storedInCloud };
}

export async function fetchSharedStudyItem(idOrUrlOrToken: string): Promise<SharedStudyPayload | null> {
  const raw = (idOrUrlOrToken || '').trim();
  if (!raw) return null;

  // Extract ?share= or ?shareData= if a full URL was pasted
  let shareId = raw;
  let shareDataToken = '';

  if (raw.includes('shareData=')) {
    shareDataToken = raw.split('shareData=')[1]?.split('&')[0] || '';
  } else if (raw.includes('share=')) {
    shareId = decodeURIComponent(raw.split('share=')[1]?.split('&')[0] || '');
  }

  if (shareDataToken) {
    const decoded = decodePortablePayload(shareDataToken);
    if (decoded) return decoded;
  }

  // Try direct portable token
  if (!shareId.startsWith('sh_') && shareId.length > 24) {
    const decoded = decodePortablePayload(shareId);
    if (decoded) return decoded;
  }

  const client = getSupabaseClient();
  if (client && isSupabaseConfigured() && shareId) {
    try {
      const { data, error } = await client
        .from('shared_items')
        .select('payload')
        .eq('id', shareId)
        .maybeSingle();
      if (!error && data?.payload) {
        return data.payload as SharedStudyPayload;
      }
    } catch { }
  }

  try {
    const localRaw = localStorage.getItem(`nook_shared_${shareId}`);
    if (localRaw) return JSON.parse(localRaw) as SharedStudyPayload;
  } catch { }

  return null;
}
