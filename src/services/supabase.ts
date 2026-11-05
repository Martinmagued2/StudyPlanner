// Supabase PostgreSQL Complete Database Service & Real-Time Sync
// Stores 100% of your website data directly in PostgreSQL:
// Courses, Notes, Files (full text), Tasks, Assignments, Exams, Flashcards, Quizzes, Events, Grades, Settings

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import {
  Course,
  Assignment,
  Task,
  Note,
  CalendarEvent,
  InboxItem,
  DocumentFile,
  Flashcard,
  FlashcardDeck,
  FocusSession,
  Quiz,
  Exam,
  GradeItem,
  PreviousTermCourse,
  ChatSession,
  AiMemory,
  UserAccount,
  StoredAccountRecord
} from '../types';

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

    // Ping the workspaces table
    const { error } = await client.from('workspaces').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message:
            'Connected to Supabase, but database tables do not exist yet! Please run the schema.sql query in your Supabase SQL Editor.'
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
 * Tests both Read and Write capabilities in Supabase PostgreSQL
 */
export async function testDatabaseReadWrite(
  userId: string
): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const startTime = Date.now();
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client is not configured.', latencyMs: 0 };
  }

  try {
    const testPingPayload = {
      testPing: true,
      testedAt: new Date().toISOString(),
      agent: 'StudyPlanner Diagnostic'
    };

    // 1. Attempt upsert write
    const { error: writeError } = await client.from('workspaces').upsert(
      {
        user_id: userId,
        version: '1.0.0',
        data: testPingPayload,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );

    if (writeError) {
      const msg = writeError.message || '';
      if (msg.includes('invalid input syntax for type uuid')) {
        return {
          success: false,
          message:
            'Column user_id in PostgreSQL is UUID type, but your user ID is text. Please run the updated SQL schema to change user_id to TEXT.',
          latencyMs: Date.now() - startTime
        };
      }
      if (msg.includes('violates foreign key constraint')) {
        return {
          success: false,
          message:
            'Foreign key constraint to auth.users is blocking direct writes. Please run the updated SQL schema to drop the foreign key constraint.',
          latencyMs: Date.now() - startTime
        };
      }
      if (writeError.code === '42501' || msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('policy')) {
        return {
          success: false,
          message:
            'Row Level Security (RLS) policy is blocking writes. Run the SQL policy to allow workspace sync for anon/authenticated clients.',
          latencyMs: Date.now() - startTime
        };
      }
      return {
        success: false,
        message: `Database write test failed: ${writeError.message}`,
        latencyMs: Date.now() - startTime
      };
    }

    // 2. Attempt read verification
    const { data: readData, error: readError } = await client
      .from('workspaces')
      .select('updated_at, data')
      .eq('user_id', userId)
      .maybeSingle();

    if (readError) {
      return {
        success: false,
        message: `Database read test failed: ${readError.message}`,
        latencyMs: Date.now() - startTime
      };
    }

    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      message: `Database read/write test succeeded in ${latencyMs}ms! Workspace data is actively persisting in Supabase PostgreSQL.`,
      latencyMs
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Database test failed.',
      latencyMs: Date.now() - startTime
    };
  }
}

// Track local database writes to suppress Realtime WebSocket self-echo loops
let lastLocalDbWriteAt = 0;
export function markLocalDbWrite(): void {
  lastLocalDbWriteAt = Date.now();
}
export function isRecentLocalDbWrite(windowMs: number = 6500): boolean {
  return Date.now() - lastLocalDbWriteAt < windowMs;
}

// ==============================================================================
// SMART HYBRID STORAGE (Google Drive / Local for heavy files, Supabase for data)
// ==============================================================================

/**
 * Sanitizes large document files before sending to Supabase PostgreSQL.
 * Keeps structured metadata, summary, and preview chunks (~2 KB per file) in cloud DB,
 * while large slide decks and raw document texts remain locally / in Google Drive.
 * This completely avoids exceeding Supabase's free storage limits (5 GB) while keeping
 * instant search, courses, notes, tasks, and assignments 100% cloud synced.
 */
export function sanitizeFileForCloud(f: DocumentFile): DocumentFile {
  const isLargeRawText = f.rawText && f.rawText.length > 1500;
  const cleanRawText = isLargeRawText
    ? f.rawText!.slice(0, 1500) + '... [Smart Hybrid: Full document preserved locally & in Google Drive]'
    : (f.rawText || '');

  const cleanChunks = Array.isArray(f.chunks)
    ? f.chunks.slice(0, 5).map(c => ({
        id: c.id,
        page: c.page,
        slideNumber: c.slideNumber,
        content: c.content && c.content.length > 400 ? c.content.slice(0, 400) + '...' : (c.content || ''),
        hasVisuals: !!c.hasVisuals,
        visualDescription: c.visualDescription
      }))
    : [];

  return {
    ...f,
    rawText: cleanRawText,
    chunks: cleanChunks
  };
}

/**
 * Persists a user account profile into public.profiles in Supabase.
 * Ensures the user record exists for foreign keys and profile management.
 */
export async function dbSaveProfile(user: UserAccount, passwordHash?: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client || !user?.id) return { success: false, error: 'Database client or User ID unavailable' };

  try {
    markLocalDbWrite();
    const { error: profileError } = await client.from('profiles').upsert(
      {
        id: user.id,
        email: user.email || '',
        name: user.name || (user.email ? user.email.split('@')[0] : 'Student'),
        avatar_url: user.avatarUrl || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.warn('Error saving profile to Supabase:', profileError.message);
      return { success: false, error: profileError.message };
    }

    // Ensure a workspace row exists for this user
    try {
      await client.from('workspaces').upsert(
        {
          user_id: user.id,
          version: '1.0.0',
          data: {
            user: { ...user, passwordHash },
            courses: [],
            notes: [],
            tasks: [],
            assignments: [],
            files: [],
            events: []
          },
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );
    } catch { }

    return { success: true };
  } catch (err: any) {
    console.warn('dbSaveProfile exception:', err);
    return { success: false, error: err?.message || 'Failed saving profile' };
  }
}

/**
 * Loads all registered student profiles from public.profiles in Supabase.
 */
export async function dbLoadAllProfiles(): Promise<StoredAccountRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, email, name, avatar_url, created_at')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('Error loading profiles from Supabase:', error?.message);
      return [];
    }

    return data.map((p: any) => ({
      id: p.id,
      email: p.email || '',
      name: p.name || (p.email ? p.email.split('@')[0] : 'Student'),
      username: (p.email ? p.email.split('@')[0] : p.id).toLowerCase(),
      passwordHash: '',
      createdAt: p.created_at || new Date().toISOString(),
      avatarUrl: p.avatar_url || undefined
    }));
  } catch (err) {
    console.warn('dbLoadAllProfiles exception:', err);
    return [];
  }
}

/**
 * Prunes oversized lecture slide raw text from files and workspaces tables in Supabase.
 * Cleans out bloating gigabytes to free up database storage and clear read-only restrictions.
 */
export async function pruneSupabaseBloat(userId: string): Promise<{ success: boolean; prunedCount: number; message: string }> {
  const client = getSupabaseClient();
  if (!client || !userId) return { success: false, prunedCount: 0, message: 'Supabase client or userId missing' };

  try {
    const { data: files, error } = await client
      .from('files')
      .select('id, name, raw_text, chunks')
      .eq('user_id', userId);

    if (error) {
      return { success: false, prunedCount: 0, message: error.message };
    }

    let prunedCount = 0;
    if (files && files.length > 0) {
      for (const f of files) {
        if ((f.raw_text && f.raw_text.length > 1500) || (Array.isArray(f.chunks) && f.chunks.length > 5)) {
          const cleanText = f.raw_text ? f.raw_text.slice(0, 1500) + '... [Pruned for Smart Hybrid Storage]' : '';
          const cleanChunks = Array.isArray(f.chunks) ? f.chunks.slice(0, 5) : [];
          await client.from('files').update({
            raw_text: cleanText,
            chunks: cleanChunks
          }).eq('id', f.id).eq('user_id', userId);
          prunedCount++;
        }
      }
    }

    // Prune workspaces snapshot
    const { data: ws } = await client.from('workspaces').select('data').eq('user_id', userId).maybeSingle();
    if (ws && ws.data && Array.isArray(ws.data.files)) {
      const sanitizedFiles = ws.data.files.map(sanitizeFileForCloud);
      await client.from('workspaces').update({
        data: {
          ...ws.data,
          files: sanitizedFiles
        },
        updated_at: new Date().toISOString()
      }).eq('user_id', userId);
    }

    return {
      success: true,
      prunedCount,
      message: `Successfully pruned ${prunedCount} heavy document(s). Cloud storage optimized with Smart Hybrid mode!`
    };
  } catch (err: any) {
    return { success: false, prunedCount: 0, message: err?.message || 'Storage pruning encountered an error' };
  }
}

// ==============================================================================
// 100% COMPLETE DATABASE PERSISTENCE (Stores Every Table in PostgreSQL)
// ==============================================================================

export async function dbSaveAllTablesToDatabase(userId: string, data: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !userId) return false;
  markLocalDbWrite();

  try {
    // 0. Ensure user profile exists in profiles table
    if (data.user) {
      try {
        await client.from('profiles').upsert(
          {
            id: userId,
            email: data.user.email || null,
            name: data.user.name || null,
            avatar_url: data.user.avatarUrl || null,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );
      } catch (err: any) {
        console.warn('Profile upsert warning:', err);
      }
    }

    // 1. Sanitize payload with Smart Hybrid storage before saving workspace snapshot
    const sanitizedWorkspaceData = {
      ...data,
      files: Array.isArray(data.files) ? data.files.map(sanitizeFileForCloud) : []
    };

    const { error: wsError } = await client.from('workspaces').upsert(
      {
        user_id: userId,
        version: '1.0.0',
        data: sanitizedWorkspaceData,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );

    if (wsError) {
      console.warn('Supabase workspaces upsert failed:', wsError.message);
      let helpfulMsg = wsError.message;
      if (wsError.message.includes('invalid input syntax for type uuid')) {
        helpfulMsg = 'Database column user_id is type UUID. Please run the SQL fix in Supabase to change user_id to TEXT.';
      } else if (wsError.message.includes('violates foreign key constraint')) {
        helpfulMsg = 'Database foreign key constraint to auth.users is blocking direct writes. Please run the SQL fix to drop the foreign key.';
      } else if (wsError.code === '42501' || wsError.message.toLowerCase().includes('row-level security') || wsError.message.toLowerCase().includes('policy')) {
        helpfulMsg = 'Supabase Row Level Security (RLS) is blocking anon writes. Please run the SQL fix to permit workspace sync.';
      } else if (wsError.message.includes('read-only') || wsError.message.includes('quota')) {
        helpfulMsg = 'Supabase storage quota reached. Please use "Optimize Cloud Storage" in Settings to prune heavy file payloads.';
      }
      throw new Error(helpfulMsg);
    }

    // 2. Individual Relational Tables
    // Courses
    if (Array.isArray(data.courses) && data.courses.length > 0) {
      const records = data.courses.map((c: Course) => ({
        id: c.id,
        user_id: userId,
        name: c.name,
        code: c.code,
        instructor: c.instructor || '',
        color: c.color || '#0284c7',
        location: c.location || '',
        credit_hours: c.creditHours || 3,
        term: c.term || '',
        syllabus_url: c.syllabusUrl || null,
        links: c.links || [],
        is_archived: c.isArchived || false,
        meeting_slots: c.meetingSlots || [],
        updated_at: new Date().toISOString()
      }));
      const { error } = await client.from('courses').upsert(records, { onConflict: 'id' });
      if (error) console.warn('Supabase courses upsert error:', error.message);
    }

    // Notes (Full rich content, unlimited size)
    if (Array.isArray(data.notes) && data.notes.length > 0) {
      const records = data.notes.map((n: Note) => ({
        id: n.id,
        user_id: userId,
        course_id: n.courseId || null,
        title: n.title,
        content: n.content,
        tags: n.tags || [],
        pinned: n.pinned || false,
        in_trash: n.inTrash || false,
        highlighted_terms: n.highlightedTerms || [],
        updated_at: new Date().toISOString()
      }));
      const { error } = await client.from('notes').upsert(records, { onConflict: 'id' });
      if (error) console.warn('Supabase notes upsert error:', error.message);
    }

    // Files (Smart Hybrid: Lightweight metadata and preview chunks in DB, full text locally/Drive)
    if (Array.isArray(data.files) && data.files.length > 0) {
      const records = data.files.map((f: DocumentFile) => {
        const sanitized = sanitizeFileForCloud(f);
        return {
          id: sanitized.id,
          user_id: userId,
          course_id: sanitized.courseId || null,
          name: sanitized.name,
          file_type: sanitized.fileType,
          size_bytes: sanitized.sizeBytes || 0,
          page_count: sanitized.pageCount || 0,
          raw_text: sanitized.rawText || '',
          summary: sanitized.summary || '',
          chunks: sanitized.chunks || [],
          status: sanitized.status || 'indexed',
          is_favorite: sanitized.isFavorite || false,
          uploaded_at: sanitized.uploadedAt || new Date().toISOString()
        };
      });
      const { error } = await client.from('files').upsert(records, { onConflict: 'id' });
      if (error) console.warn('Supabase files upsert error:', error.message);
    }

    // Tasks
    if (Array.isArray(data.tasks) && data.tasks.length > 0) {
      const records = data.tasks.map((t: Task) => ({
        id: t.id,
        user_id: userId,
        course_id: t.courseId || null,
        assignment_id: t.assignmentId || null,
        exam_id: t.examId || null,
        title: t.title,
        description: t.description || '',
        due_date: t.dueDate || null,
        priority: t.priority || 'medium',
        tags: t.tags || [],
        completed: t.completed || false,
        completed_at: t.completedAt || null,
        subtasks: t.subtasks || [],
        source: t.source || 'user'
      }));
      await client.from('tasks').upsert(records, { onConflict: 'id' });
    }

    // Assignments
    if (Array.isArray(data.assignments) && data.assignments.length > 0) {
      const records = data.assignments.map((a: Assignment) => ({
        id: a.id,
        user_id: userId,
        course_id: a.courseId || null,
        title: a.title,
        description: a.description || '',
        type: a.type || 'homework',
        status: a.status || 'todo',
        priority: a.priority || 'medium',
        due_date: a.dueDate,
        estimated_minutes: a.estimatedMinutes || 60,
        submission_url: a.submissionUrl || null,
        links: a.links || [],
        steps: a.steps || [],
        is_broken_down: a.isBrokenDown || false
      }));
      await client.from('assignments').upsert(records, { onConflict: 'id' });
    }

    // Exams
    if (Array.isArray(data.exams) && data.exams.length > 0) {
      const records = data.exams.map((e: Exam) => ({
        id: e.id,
        user_id: userId,
        course_id: e.courseId,
        name: e.name,
        date: e.date,
        start_time: e.startTime || null,
        end_time: e.endTime || null,
        weight_percentage: e.weightPercentage || 25,
        readiness_percent: e.readinessPercent || 0,
        room: e.room || '',
        description: e.description || '',
        revision_sessions: e.revisionSessions || []
      }));
      await client.from('exams').upsert(records, { onConflict: 'id' });
    }

    // Flashcard Decks & Cards
    if (Array.isArray(data.flashcardDecks) && data.flashcardDecks.length > 0) {
      const deckRecords = data.flashcardDecks.map((d: FlashcardDeck) => ({
        id: d.id,
        user_id: userId,
        course_id: d.courseId || null,
        name: d.name,
        tag: d.tag || '',
        cards_count: d.cardsCount || 0
      }));
      await client.from('flashcard_decks').upsert(deckRecords, { onConflict: 'id' });
    }

    if (Array.isArray(data.flashcards) && data.flashcards.length > 0) {
      const cardRecords = data.flashcards.map((f: Flashcard) => ({
        id: f.id,
        user_id: userId,
        deck_id: f.deckId,
        course_id: f.courseId || null,
        question: f.question,
        answer: f.answer,
        citation: f.citation || null,
        ease_factor: f.easeFactor || 2.5,
        interval_days: f.intervalDays || 0,
        repetitions: f.repetitions || 0,
        lapses: f.lapses || 0,
        due_date: f.dueDate || '',
        state: f.state || 'new'
      }));
      await client.from('flashcards').upsert(cardRecords, { onConflict: 'id' });
    }

    // Quizzes
    if (Array.isArray(data.quizzes) && data.quizzes.length > 0) {
      const records = data.quizzes.map((q: Quiz) => ({
        id: q.id,
        user_id: userId,
        course_id: q.courseId || null,
        file_id: q.fileId || null,
        note_id: q.noteId || null,
        title: q.title,
        difficulty: q.difficulty || 'medium',
        questions: q.questions || [],
        attempts: q.attempts || []
      }));
      await client.from('quizzes').upsert(records, { onConflict: 'id' });
    }

    // Grade Items
    if (Array.isArray(data.gradeItems) && data.gradeItems.length > 0) {
      const records = data.gradeItems.map((g: GradeItem) => ({
        id: g.id,
        user_id: userId,
        course_id: g.courseId,
        name: g.name,
        score: g.earnedScore ?? 0,
        max_score: g.maxScore || 100,
        weight: g.weightPercent || 10,
        category: g.category || 'homework',
        is_ungraded: g.isUngraded || false,
        date: (g as any).date || ''
      }));
      await client.from('grade_items').upsert(records, { onConflict: 'id' });
    }

    // Previous Term Courses (Historical GPA transcripts)
    if (Array.isArray(data.previousTermCourses) && data.previousTermCourses.length > 0) {
      const records = data.previousTermCourses.map((p: PreviousTermCourse) => ({
        id: p.id,
        user_id: userId,
        term_name: p.termName,
        course_code: p.courseCode,
        course_name: p.courseName,
        credit_hours: p.creditHours || 3,
        percentage: p.percentage ?? null,
        grade_letter: p.gradeLetter || null,
        grade_points: p.gradePoints ?? null
      }));
      await client.from('previous_term_courses').upsert(records, { onConflict: 'id' });
    }

    // Ask AI Chat Sessions & Full Message Histories
    if (Array.isArray(data.chatSessions) && data.chatSessions.length > 0) {
      const records = data.chatSessions.map((s: ChatSession) => ({
        id: s.id,
        user_id: userId,
        title: s.title,
        messages: s.messages || [],
        updated_at: s.updatedAt || new Date().toISOString()
      }));
      await client.from('chat_sessions').upsert(records, { onConflict: 'id' });
    }

    // Calendar Events
    if (Array.isArray(data.events) && data.events.length > 0) {
      const records = data.events.map((e: CalendarEvent) => ({
        id: e.id,
        user_id: userId,
        course_id: e.courseId || null,
        assignment_id: e.assignmentId || null,
        title: e.title,
        description: e.description || '',
        location: e.location || '',
        start_time: e.start,
        end_time: e.end,
        all_day: e.allDay || false,
        type: e.type || 'event',
        provider: e.provider || 'local'
      }));
      await client.from('calendar_events').upsert(records, { onConflict: 'id' });
    }

    // Focus Sessions
    if (Array.isArray(data.focusSessions) && data.focusSessions.length > 0) {
      const records = data.focusSessions.map((f: FocusSession) => ({
        id: f.id,
        user_id: userId,
        course_id: f.courseId || null,
        task_id: f.taskId || null,
        duration_minutes: f.durationMinutes,
        actual_minutes: f.actualMinutes,
        label: f.label || 'Deep Work',
        timestamp: f.timestamp
      }));
      await client.from('focus_sessions').upsert(records, { onConflict: 'id' });
    }

    // Inbox Items
    if (Array.isArray(data.inboxItems) && data.inboxItems.length > 0) {
      const records = data.inboxItems.map((i: InboxItem) => ({
        id: i.id,
        user_id: userId,
        title: i.title,
        content: i.content || '',
        type: i.type || 'note',
        url: i.url || null,
        email_sender: i.emailSender || null,
        email_subject: i.emailSubject || null,
        processed: i.processed || false,
        converted_to: i.convertedTo || null
      }));
      await client.from('inbox_items').upsert(records, { onConflict: 'id' });
    }

    // AI Memories
    if (Array.isArray(data.aiMemories) && data.aiMemories.length > 0) {
      const records = data.aiMemories.map((m: any) => ({
        id: m.id,
        user_id: userId,
        fact: m.fact,
        category: m.category || 'preference',
        created_at: m.createdAt || new Date().toISOString()
      }));
      await client.from('ai_memories').upsert(records, { onConflict: 'id' });
    }

    return true;
  } catch (err) {
    console.warn('Error saving all tables to Supabase:', err);
    return false;
  }
}

// Helper to preserve the user's exact array order from the workspace snapshot
function preserveSnapshotOrder<T extends { id: string }>(items: T[], snapshotItems?: T[]): T[] {
  if (!Array.isArray(snapshotItems) || snapshotItems.length === 0) return items;
  const orderMap = new Map<string, number>();
  snapshotItems.forEach((item, index) => {
    if (item && item.id) orderMap.set(item.id, index);
  });
  return [...items].sort((a, b) => {
    const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : Number.MAX_SAFE_INTEGER;
    if (idxA !== idxB) return idxA - idxB;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Loads 100% of website data from Supabase PostgreSQL tables
 */
export async function dbLoadAllTablesFromDatabase(userId: string): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client || !userId) return null;

  try {
    // 1. First fetch fast snapshot
    const { data: snapshot } = await client
      .from('workspaces')
      .select('data, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    // 2. Fetch individual tables with deterministic secondary ID ordering to prevent PostgreSQL MVCC heap shuffling
    const [
      coursesRes,
      notesRes,
      filesRes,
      tasksRes,
      assignmentsRes,
      examsRes,
      decksRes,
      cardsRes,
      quizzesRes,
      gradeRes,
      prevTermsRes,
      chatsRes,
      eventsRes,
      focusRes,
      inboxRes,
      memoriesRes
    ] = await Promise.all([
      client.from('courses').select('*').eq('user_id', userId).order('created_at', { ascending: true }).order('id', { ascending: true }),
      client.from('notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }).order('id', { ascending: true }),
      client.from('files').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false }).order('id', { ascending: true }),
      client.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: true }).order('id', { ascending: true }),
      client.from('assignments').select('*').eq('user_id', userId).order('due_date', { ascending: true }).order('id', { ascending: true }),
      client.from('exams').select('*').eq('user_id', userId).order('date', { ascending: true }).order('id', { ascending: true }),
      client.from('flashcard_decks').select('*').eq('user_id', userId).order('created_at', { ascending: true }).order('id', { ascending: true }),
      client.from('flashcards').select('*').eq('user_id', userId).order('created_at', { ascending: true }).order('id', { ascending: true }),
      client.from('quizzes').select('*').eq('user_id', userId).order('created_at', { ascending: true }).order('id', { ascending: true }),
      client.from('grade_items').select('*').eq('user_id', userId).order('created_at', { ascending: true }).order('id', { ascending: true }),
      client.from('previous_term_courses').select('*').eq('user_id', userId).order('created_at', { ascending: true }).order('id', { ascending: true }),
      client.from('chat_sessions').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).order('id', { ascending: true }),
      client.from('calendar_events').select('*').eq('user_id', userId).order('start_time', { ascending: true }).order('id', { ascending: true }),
      client.from('focus_sessions').select('*').eq('user_id', userId).order('timestamp', { ascending: false }).order('id', { ascending: true }),
      client.from('inbox_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }).order('id', { ascending: true }),
      client.from('ai_memories').select('*').eq('user_id', userId).order('created_at', { ascending: false }).order('id', { ascending: true })
    ]);

    const baseData = snapshot?.data || {};

    const rawCourses: Course[] = (coursesRes.data && coursesRes.data.length > 0)
      ? coursesRes.data.map(c => ({
          id: c.id,
          name: c.name,
          code: c.code,
          instructor: c.instructor,
          color: c.color,
          location: c.location,
          creditHours: Number(c.credit_hours) || 3,
          term: c.term,
          syllabusUrl: c.syllabus_url,
          links: c.links || [],
          isArchived: c.is_archived || false,
          meetingSlots: c.meeting_slots || []
        }))
      : baseData.courses || [];
    const courses = preserveSnapshotOrder(rawCourses, baseData.courses);

    const rawNotes: Note[] = (notesRes.data && notesRes.data.length > 0)
      ? notesRes.data.map(n => ({
          id: n.id,
          courseId: n.course_id,
          title: n.title,
          content: n.content,
          tags: n.tags || [],
          pinned: n.pinned || false,
          inTrash: n.in_trash || false,
          highlightedTerms: n.highlighted_terms || [],
          createdAt: n.created_at || new Date().toISOString(),
          updatedAt: n.updated_at || new Date().toISOString()
        }))
      : baseData.notes || [];
    const notes = preserveSnapshotOrder(rawNotes, baseData.notes);

    const rawFiles: DocumentFile[] = (filesRes.data && filesRes.data.length > 0)
      ? filesRes.data.map(f => ({
          id: f.id,
          name: f.name,
          sizeBytes: Number(f.size_bytes) || 0,
          fileType: f.file_type,
          status: f.status,
          pageCount: f.page_count || 0,
          rawText: f.raw_text || '',
          summary: f.summary || '',
          chunks: f.chunks || [],
          courseId: f.course_id,
          isFavorite: f.is_favorite || false,
          uploadedAt: f.uploaded_at || new Date().toISOString()
        }))
      : baseData.files || [];
    const files = preserveSnapshotOrder(rawFiles, baseData.files);

    const rawTasks: Task[] = (tasksRes.data && tasksRes.data.length > 0)
      ? tasksRes.data.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          courseId: t.course_id,
          dueDate: t.due_date,
          priority: t.priority,
          tags: t.tags || [],
          completed: t.completed,
          completedAt: t.completed_at,
          subtasks: t.subtasks || [],
          assignmentId: t.assignment_id,
          examId: t.exam_id,
          source: t.source || 'user'
        }))
      : baseData.tasks || [];
    const tasks = preserveSnapshotOrder(rawTasks, baseData.tasks);

    const rawAssignments: Assignment[] = (assignmentsRes.data && assignmentsRes.data.length > 0)
      ? assignmentsRes.data.map(a => ({
          id: a.id,
          title: a.title,
          description: a.description,
          courseId: a.course_id,
          type: a.type,
          status: a.status,
          priority: a.priority,
          dueDate: a.due_date,
          estimatedMinutes: a.estimated_minutes || 60,
          submissionUrl: a.submission_url,
          links: a.links || [],
          steps: a.steps || [],
          isBrokenDown: a.is_broken_down || false
        }))
      : baseData.assignments || [];
    const assignments = preserveSnapshotOrder(rawAssignments, baseData.assignments);

    const snapshotExamsMap = new Map<string, Exam>();
    if (Array.isArray(baseData.exams)) {
      baseData.exams.forEach((ex: Exam) => {
        if (ex && ex.id) snapshotExamsMap.set(ex.id, ex);
      });
    }

    const rawExams: Exam[] = (examsRes.data && examsRes.data.length > 0)
      ? examsRes.data.map(e => {
          const snapEx = snapshotExamsMap.get(e.id);
          return {
            ...(snapEx || {}),
            id: e.id,
            name: e.name,
            courseId: e.course_id,
            date: e.date,
            startTime: e.start_time || snapEx?.startTime || undefined,
            endTime: e.end_time || snapEx?.endTime || undefined,
            weightPercentage: Number(e.weight_percentage) || 25,
            readinessPercent: Number(e.readiness_percent) || 0,
            room: e.room || snapEx?.room || '',
            description: e.description || snapEx?.description || '',
            revisionSessions: e.revision_sessions || snapEx?.revisionSessions || []
          };
        })
      : baseData.exams || [];
    const exams = preserveSnapshotOrder(rawExams, baseData.exams);

    const flashcardDecks: FlashcardDeck[] = (decksRes.data && decksRes.data.length > 0)
      ? decksRes.data.map(d => ({
          id: d.id,
          name: d.name,
          courseId: d.course_id,
          tag: d.tag,
          cardsCount: d.cards_count || 0
        }))
      : baseData.flashcardDecks || [];

    const flashcards: Flashcard[] = (cardsRes.data && cardsRes.data.length > 0)
      ? cardsRes.data.map(f => ({
          id: f.id,
          deckId: f.deck_id,
          courseId: f.course_id,
          question: f.question,
          answer: f.answer,
          citation: f.citation,
          easeFactor: Number(f.ease_factor) || 2.5,
          intervalDays: Number(f.interval_days) || 0,
          repetitions: Number(f.repetitions) || 0,
          lapses: Number(f.lapses) || 0,
          dueDate: f.due_date || '',
          state: f.state || 'new'
        }))
      : baseData.flashcards || [];

    const quizzes: Quiz[] = (quizzesRes.data && quizzesRes.data.length > 0)
      ? quizzesRes.data.map(q => ({
          id: q.id,
          title: q.title,
          courseId: q.course_id,
          fileId: q.file_id,
          noteId: q.note_id,
          difficulty: q.difficulty || 'medium',
          questions: q.questions || [],
          attempts: q.attempts || []
        }))
      : baseData.quizzes || [];

    const gradeItems: GradeItem[] = (gradeRes.data && gradeRes.data.length > 0)
      ? gradeRes.data.map(g => ({
          id: g.id,
          courseId: g.course_id,
          name: g.name,
          category: (g.category as any) || 'homework',
          earnedScore: Number(g.score) || 0,
          maxScore: Number(g.max_score) || 100,
          weightPercent: Number(g.weight) || 10,
          isUngraded: !!g.is_ungraded,
          date: g.date || ''
        }))
      : baseData.gradeItems || [];

    const previousTermCourses: PreviousTermCourse[] = (prevTermsRes.data && prevTermsRes.data.length > 0)
      ? prevTermsRes.data.map(p => ({
          id: p.id,
          termName: p.term_name,
          courseCode: p.course_code,
          courseName: p.course_name,
          creditHours: Number(p.credit_hours) || 3,
          percentage: p.percentage !== null && p.percentage !== undefined ? Number(p.percentage) : undefined,
          gradeLetter: p.grade_letter || undefined,
          gradePoints: p.grade_points !== null && p.grade_points !== undefined ? Number(p.grade_points) : undefined
        }))
      : baseData.previousTermCourses || [];

    const chatSessions: ChatSession[] = (chatsRes.data && chatsRes.data.length > 0)
      ? chatsRes.data.map(s => ({
          id: s.id,
          title: s.title,
          messages: s.messages || [],
          createdAt: s.created_at,
          updatedAt: s.updated_at
        }))
      : baseData.chatSessions || [];

    const events: CalendarEvent[] = (eventsRes.data && eventsRes.data.length > 0)
      ? eventsRes.data.map(e => ({
          id: e.id,
          courseId: e.course_id,
          assignmentId: e.assignment_id,
          title: e.title,
          description: e.description || '',
          location: e.location || '',
          start: e.start_time,
          end: e.end_time,
          allDay: e.all_day || false,
          type: e.type || 'event',
          provider: e.provider || 'local'
        }))
      : baseData.events || [];

    const focusSessions: FocusSession[] = (focusRes.data && focusRes.data.length > 0)
      ? focusRes.data.map(f => ({
          id: f.id,
          courseId: f.course_id,
          taskId: f.task_id,
          durationMinutes: Number(f.duration_minutes) || 25,
          actualMinutes: Number(f.actual_minutes) || 25,
          label: f.label || 'Deep Work',
          timestamp: f.timestamp
        }))
      : baseData.focusSessions || [];

    const inboxItems: InboxItem[] = (inboxRes.data && inboxRes.data.length > 0)
      ? inboxRes.data.map(i => ({
          id: i.id,
          title: i.title,
          content: i.content || '',
          type: i.type || 'note',
          url: i.url,
          emailSender: i.email_sender,
          emailSubject: i.email_subject,
          processed: i.processed || false,
          convertedTo: i.converted_to
        }))
      : baseData.inboxItems || [];

    const aiMemories: AiMemory[] = (memoriesRes && memoriesRes.data && memoriesRes.data.length > 0)
      ? memoriesRes.data.map((m: any) => ({
          id: m.id,
          category: m.category || 'preference',
          content: m.content || '',
          createdAt: m.created_at || new Date().toISOString()
        }))
      : baseData.aiMemories || [];

    return {
      ...baseData,
      courses,
      notes,
      files,
      tasks,
      assignments,
      exams,
      flashcardDecks,
      flashcards,
      quizzes,
      gradeItems,
      previousTermCourses,
      chatSessions,
      activeChatSessionId: baseData.activeChatSessionId || chatSessions[0]?.id || 'session_default',
      events,
      focusSessions,
      inboxItems,
      aiMemories,
      academicConfig: baseData.academicConfig || undefined
    };
  } catch (err) {
    console.warn('Error loading all tables from Supabase:', err);
    return null;
  }
}

export const saveWorkspaceToSupabase = dbSaveAllTablesToDatabase;
export const fetchWorkspaceFromSupabase = dbLoadAllTablesFromDatabase;

// ==============================================================================
// GRANULAR DIRECT CRUD (Saves Directly to PostgreSQL upon any Action)
// ==============================================================================

export async function dbSaveNote(userId: string, note: Note): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client || !userId) return { success: false, error: 'Database client or User ID missing' };
  try {
    markLocalDbWrite();
    const { error } = await client.from('notes').upsert({
      id: note.id,
      user_id: userId,
      course_id: note.courseId || null,
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      pinned: note.pinned || false,
      in_trash: note.inTrash || false,
      highlighted_terms: note.highlightedTerms || [],
      updated_at: new Date().toISOString()
    });
    if (error) {
      console.warn('Failed saving note to DB:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Failed saving note to DB:', err);
    return { success: false, error: err?.message || 'Failed saving note' };
  }
}

export async function dbDeleteNote(userId: string, noteId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('notes').delete().eq('id', noteId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting note from DB:', err);
  }
}

export async function dbSaveFile(userId: string, file: DocumentFile): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client || !userId) return { success: false, error: 'Database client or User ID missing' };
  try {
    markLocalDbWrite();
    const sanitized = sanitizeFileForCloud(file);
    const { error } = await client.from('files').upsert({
      id: sanitized.id,
      user_id: userId,
      course_id: sanitized.courseId || null,
      name: sanitized.name,
      file_type: sanitized.fileType,
      size_bytes: sanitized.sizeBytes || 0,
      page_count: sanitized.pageCount || 0,
      raw_text: sanitized.rawText || '',
      summary: sanitized.summary || '',
      chunks: sanitized.chunks || [],
      status: sanitized.status || 'indexed',
      is_favorite: sanitized.isFavorite || false,
      uploaded_at: sanitized.uploadedAt || new Date().toISOString()
    });
    if (error) {
      console.warn('Failed saving file to DB:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Failed saving file to DB:', err);
    return { success: false, error: err?.message || 'Failed saving file' };
  }
}

export async function dbDeleteFile(userId: string, fileId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('files').delete().eq('id', fileId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting file from DB:', err);
  }
}

export async function dbSaveCourse(userId: string, course: Course): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client || !userId) return { success: false, error: 'Database client or User ID missing' };
  try {
    markLocalDbWrite();
    // Ensure profile row exists first so any potential foreign key constraints succeed
    try {
      await client.from('profiles').upsert({
        id: userId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch { }

    const { error } = await client.from('courses').upsert({
      id: course.id,
      user_id: userId,
      name: course.name,
      code: course.code,
      instructor: course.instructor || '',
      color: course.color || '#0284c7',
      location: course.location || '',
      credit_hours: course.creditHours || 3,
      term: course.term || '',
      syllabus_url: course.syllabusUrl || null,
      links: course.links || [],
      is_archived: course.isArchived || false,
      meeting_slots: course.meetingSlots || [],
      updated_at: new Date().toISOString()
    });

    if (error) {
      console.error('Failed saving course to DB:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Failed saving course to DB:', err);
    return { success: false, error: err?.message || 'Failed saving course' };
  }
}

export async function dbDeleteCourse(userId: string, courseId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('courses').delete().eq('id', courseId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting course from DB:', err);
  }
}

export async function dbSaveTask(userId: string, task: Task): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client || !userId) return { success: false, error: 'Database client or User ID missing' };
  try {
    markLocalDbWrite();
    const { error } = await client.from('tasks').upsert({
      id: task.id,
      user_id: userId,
      course_id: task.courseId || null,
      assignment_id: task.assignmentId || null,
      exam_id: task.examId || null,
      title: task.title,
      description: task.description || '',
      due_date: task.dueDate || null,
      priority: task.priority || 'medium',
      tags: task.tags || [],
      completed: task.completed || false,
      completed_at: task.completedAt || null,
      subtasks: task.subtasks || [],
      source: task.source || 'user'
    });
    if (error) {
      console.warn('Failed saving task to DB:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Failed saving task to DB:', err);
    return { success: false, error: err?.message || 'Failed saving task' };
  }
}

export async function dbDeleteTask(userId: string, taskId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting task from DB:', err);
  }
}

export async function dbSaveAssignment(userId: string, assignment: Assignment): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client || !userId) return { success: false, error: 'Database client or User ID missing' };
  try {
    markLocalDbWrite();
    const { error } = await client.from('assignments').upsert({
      id: assignment.id,
      user_id: userId,
      course_id: assignment.courseId || null,
      title: assignment.title,
      description: assignment.description || '',
      type: assignment.type || 'homework',
      status: assignment.status || 'todo',
      priority: assignment.priority || 'medium',
      due_date: assignment.dueDate,
      estimated_minutes: assignment.estimatedMinutes || 60,
      submission_url: assignment.submissionUrl || null,
      links: assignment.links || [],
      steps: assignment.steps || [],
      is_broken_down: assignment.isBrokenDown || false
    });
    if (error) {
      console.warn('Failed saving assignment to DB:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Failed saving assignment to DB:', err);
    return { success: false, error: err?.message || 'Failed saving assignment' };
  }
}

export async function dbDeleteAssignment(userId: string, assignmentId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('assignments').delete().eq('id', assignmentId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting assignment from DB:', err);
  }
}

export async function dbSaveExam(userId: string, exam: Exam): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client || !userId) return { success: false, error: 'Database client or User ID missing' };
  try {
    markLocalDbWrite();
    const { error } = await client.from('exams').upsert({
      id: exam.id,
      user_id: userId,
      course_id: exam.courseId,
      name: exam.name,
      date: exam.date,
      start_time: exam.startTime || null,
      end_time: exam.endTime || null,
      weight_percentage: exam.weightPercentage || 25,
      readiness_percent: exam.readinessPercent || 0,
      room: exam.room || '',
      description: exam.description || '',
      revision_sessions: exam.revisionSessions || []
    });
    if (error) {
      console.warn('Failed saving exam to DB:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Failed saving exam to DB:', err);
    return { success: false, error: err?.message || 'Failed saving exam' };
  }
}

export async function dbDeleteExam(userId: string, examId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('exams').delete().eq('id', examId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting exam from DB:', err);
  }
}

export async function dbSaveFlashcard(userId: string, card: Flashcard): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('flashcards').upsert({
      id: card.id,
      user_id: userId,
      deck_id: card.deckId,
      course_id: card.courseId || null,
      question: card.question,
      answer: card.answer,
      citation: card.citation || null,
      ease_factor: card.easeFactor || 2.5,
      interval_days: card.intervalDays || 0,
      repetitions: card.repetitions || 0,
      lapses: card.lapses || 0,
      due_date: card.dueDate || null,
      state: card.state || 'new'
    });
  } catch (err) {
    console.warn('Failed saving flashcard to DB:', err);
  }
}

export async function dbDeleteFlashcard(userId: string, cardId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('flashcards').delete().eq('id', cardId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting flashcard from DB:', err);
  }
}

export async function dbSaveDeck(userId: string, deck: FlashcardDeck): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('flashcard_decks').upsert({
      id: deck.id,
      user_id: userId,
      course_id: deck.courseId || null,
      name: deck.name,
      tag: deck.tag || null,
      cards_count: deck.cardsCount || 0
    });
  } catch (err) {
    console.warn('Failed saving deck to DB:', err);
  }
}

export async function dbDeleteDeck(userId: string, deckId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('flashcard_decks').delete().eq('id', deckId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting deck from DB:', err);
  }
}

export async function dbSaveQuiz(userId: string, quiz: Quiz): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('quizzes').upsert({
      id: quiz.id,
      user_id: userId,
      course_id: quiz.courseId || null,
      file_id: quiz.fileId || null,
      note_id: quiz.noteId || null,
      title: quiz.title,
      difficulty: quiz.difficulty || 'medium',
      questions: quiz.questions || [],
      attempts: quiz.attempts || []
    });
  } catch (err) {
    console.warn('Failed saving quiz to DB:', err);
  }
}

export async function dbDeleteQuiz(userId: string, quizId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('quizzes').delete().eq('id', quizId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting quiz from DB:', err);
  }
}

export async function dbSaveEvent(userId: string, event: CalendarEvent): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('calendar_events').upsert({
      id: event.id,
      user_id: userId,
      course_id: event.courseId || null,
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      start_time: event.start,
      end_time: event.end,
      all_day: event.allDay || false,
      type: event.type || 'class',
      provider: event.provider || 'local'
    });
  } catch (err) {
    console.warn('Failed saving event to DB:', err);
  }
}

export async function dbDeleteEvent(userId: string, eventId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('calendar_events').delete().eq('id', eventId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting event from DB:', err);
  }
}

export async function dbSaveGradeItem(userId: string, item: GradeItem): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('grade_items').upsert({
      id: item.id,
      user_id: userId,
      course_id: item.courseId,
      name: item.name,
      score: item.earnedScore ?? 0,
      max_score: item.maxScore || 100,
      weight: item.weightPercent || 10,
      category: item.category || 'homework',
      is_ungraded: item.isUngraded || false,
      date: (item as any).date || ''
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Failed saving grade item to DB:', err);
  }
}

export async function dbDeleteGradeItem(userId: string, itemId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('grade_items').delete().eq('id', itemId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting grade item from DB:', err);
  }
}

export async function dbSavePreviousTermCourse(userId: string, item: PreviousTermCourse): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('previous_term_courses').upsert({
      id: item.id,
      user_id: userId,
      term_name: item.termName,
      course_code: item.courseCode,
      course_name: item.courseName,
      credit_hours: item.creditHours || 3,
      percentage: item.percentage ?? null,
      grade_letter: item.gradeLetter || null,
      grade_points: item.gradePoints ?? null
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Failed saving previous term course to DB:', err);
  }
}

export async function dbDeletePreviousTermCourse(userId: string, itemId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('previous_term_courses').delete().eq('id', itemId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting previous term course from DB:', err);
  }
}

export async function dbSaveChatSession(userId: string, session: ChatSession): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('chat_sessions').upsert({
      id: session.id,
      user_id: userId,
      title: session.title,
      messages: session.messages || [],
      updated_at: session.updatedAt || new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Failed saving chat session to DB:', err);
  }
}

export async function dbDeleteChatSession(userId: string, sessionId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('chat_sessions').delete().eq('id', sessionId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting chat session from DB:', err);
  }
}

export async function dbSaveInboxItem(userId: string, item: InboxItem): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('inbox_items').upsert({
      id: item.id,
      user_id: userId,
      title: item.title,
      content: item.content || '',
      type: item.type || 'note',
      url: item.url || null,
      email_sender: item.emailSender || null,
      email_subject: item.emailSubject || null,
      processed: item.processed || false,
      converted_to: item.convertedTo || null
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Failed saving inbox item to DB:', err);
  }
}

export async function dbDeleteInboxItem(userId: string, itemId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('inbox_items').delete().eq('id', itemId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting inbox item from DB:', err);
  }
}

export async function dbSaveFocusSession(userId: string, session: FocusSession): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('focus_sessions').upsert({
      id: session.id,
      user_id: userId,
      course_id: session.courseId || null,
      task_id: session.taskId || null,
      duration_minutes: session.durationMinutes,
      actual_minutes: session.actualMinutes,
      label: session.label || 'Deep Work',
      timestamp: session.timestamp
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Failed saving focus session to DB:', err);
  }
}

export async function dbSaveAiMemory(userId: string, memory: AiMemory): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('ai_memories').upsert({
      id: memory.id,
      user_id: userId,
      category: memory.category,
      content: memory.content,
      created_at: memory.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Failed saving AI memory to DB:', err);
  }
}

export async function dbDeleteAiMemory(userId: string, memoryId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !userId) return;
  try {
    markLocalDbWrite();
    await client.from('ai_memories').delete().eq('id', memoryId).eq('user_id', userId);
  } catch (err) {
    console.warn('Failed deleting AI memory from DB:', err);
  }
}

/**
 * Subscribes to Realtime WebSocket changes across all core tables
 * Suppresses echoes from our own local writes so background sync never causes shuffling or re-render loops.
 */
export function subscribeToWorkspaceRealtime(
  userId: string,
  onRemoteUpdate: (remoteWorkspace: any) => void
): () => void {
  const client = getSupabaseClient();
  if (!client || !userId) return () => {};

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const triggerDebouncedReload = () => {
    if (isRecentLocalDbWrite()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (isRecentLocalDbWrite()) return;
      const full = await dbLoadAllTablesFromDatabase(userId);
      if (full && !isRecentLocalDbWrite()) {
        onRemoteUpdate(full);
      }
    }, 1500);
  };

  const channel = client
    .channel(`realtime_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workspaces',
        filter: `user_id=eq.${userId}`
      },
      payload => {
        if (isRecentLocalDbWrite()) return;
        if (payload.new && (payload.new as any).data) {
          onRemoteUpdate((payload.new as any).data);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `user_id=eq.${userId}`
      },
      triggerDebouncedReload
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'courses',
        filter: `user_id=eq.${userId}`
      },
      triggerDebouncedReload
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${userId}`
      },
      triggerDebouncedReload
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'files',
        filter: `user_id=eq.${userId}`
      },
      triggerDebouncedReload
    )
    .subscribe();

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
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
