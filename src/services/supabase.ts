// Supabase PostgreSQL Database Service & Real-Time Sync for StudyPlanner
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Retrieve configuration from environment variables or custom UI configuration
export function getSupabaseConfig(): SupabaseConfig | null {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('nook_supabase_url') : null;
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('nook_supabase_anon_key') : null;

  const url = (customUrl || envUrl || '').trim();
  const anonKey = (customKey || envKey || '').trim();

  if (url && anonKey && url.startsWith('http')) {
    return { url, anonKey };
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

// Global Client Instance
let supabaseInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) {
    supabaseInstance = null;
    currentConfigKey = '';
    return null;
  }

  const key = `${config.url}::${config.anonKey}`;
  if (!supabaseInstance || currentConfigKey !== key) {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    currentConfigKey = key;
  }

  return supabaseInstance;
}

/**
 * Saves custom Supabase credentials from the UI
 */
export function setCustomSupabaseConfig(url: string, anonKey: string): boolean {
  try {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();
    if (!cleanUrl || !cleanKey) {
      localStorage.removeItem('nook_supabase_url');
      localStorage.removeItem('nook_supabase_anon_key');
      supabaseInstance = null;
      currentConfigKey = '';
      return false;
    }

    localStorage.setItem('nook_supabase_url', cleanUrl);
    localStorage.setItem('nook_supabase_anon_key', cleanKey);
    supabaseInstance = null;
    currentConfigKey = '';
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes custom Supabase credentials
 */
export function clearCustomSupabaseConfig(): void {
  localStorage.removeItem('nook_supabase_url');
  localStorage.removeItem('nook_supabase_anon_key');
  supabaseInstance = null;
  currentConfigKey = '';
}

/**
 * Tests connection to a Supabase project by querying workspaces
 */
export async function testSupabaseConnection(
  testUrl?: string,
  testKey?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const client =
      testUrl && testKey
        ? createClient(testUrl.trim(), testKey.trim())
        : getSupabaseClient();

    if (!client) {
      return { success: false, message: 'Supabase URL and Anon Key are missing.' };
    }

    // Ping the workspaces table or check connection
    const { error } = await client.from('workspaces').select('id').limit(1);

    if (error) {
      // If table doesn't exist yet, warn user to run schema.sql
      if (error.code === '42P01') {
        return {
          success: false,
          message:
            'Connected to Supabase, but the "workspaces" table does not exist yet! Please run the schema.sql query in your Supabase SQL Editor.'
        };
      }
      return { success: false, message: `Database error: ${error.message}` };
    }

    return { success: true, message: 'Successfully connected to Supabase PostgreSQL database!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Connection failed.' };
  }
}

/**
 * Saves full workspace snapshot to Supabase PostgreSQL
 */
export async function saveWorkspaceToSupabase(userId: string, workspaceData: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !userId) return false;

  try {
    const { error } = await client.from('workspaces').upsert(
      {
        user_id: userId,
        version: '1.0.0',
        data: workspaceData,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.warn('Supabase upsert warning:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Failed to save to Supabase:', err);
    return false;
  }
}

/**
 * Fetches workspace snapshot from Supabase PostgreSQL
 */
export async function fetchWorkspaceFromSupabase(userId: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

  try {
    const { data, error } = await client
      .from('workspaces')
      .select('data, updated_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      ...data.data,
      _dbUpdatedAt: data.updated_at
    };
  } catch (err) {
    console.warn('Failed to fetch from Supabase:', err);
    return null;
  }
}

/**
 * Subscribes to Realtime WebSocket changes on the workspaces table
 * When your laptop updates a note, your phone receives it immediately (< 100ms)
 */
export function subscribeToWorkspaceRealtime(
  userId: string,
  onRemoteUpdate: (remoteWorkspace: any) => void
): () => void {
  const client = getSupabaseClient();
  if (!client || !userId) return () => {};

  const channel = client
    .channel(`workspace_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workspaces',
        filter: `user_id=eq.${userId}`
      },
      payload => {
        if (payload.new && (payload.new as any).data) {
          onRemoteUpdate((payload.new as any).data);
        }
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Authentication Helpers
 */
export async function supabaseSignUp(email: string, password: string, name?: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password: password.trim(),
    options: {
      data: {
        name: name?.trim() || email.split('@')[0]
      }
    }
  });

  if (error) throw error;
  return data;
}

export async function supabaseSignIn(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim()
  });

  if (error) throw error;
  return data;
}

export async function supabaseSignInWithOtp(email: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const { data, error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  if (error) throw error;
  return data;
}

export async function supabaseSignOut() {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
}

export async function getSupabaseUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user || null;
}

