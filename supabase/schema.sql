-- ==============================================================================
-- STUDYPLANNER / NOOK - COMPLETE SUPABASE POSTGRESQL DATABASE SCHEMA
-- ==============================================================================
-- Stores 100% of your website data across all tables:
-- - All Courses, Meeting Schedules, Syllabi & Colors
-- - All Notes (full rich HTML/Markdown, unlimited size, tags, pinned status)
-- - All Files & Lecture Slides (full extracted slide text, OCR, chunks, summaries)
-- - All Assignments, Subtasks & Checklists
-- - All Tasks & Priorities
-- - All Exams, Grade Targets & Revision Schedules
-- - All Flashcard Decks & Spaced Repetition (SM-2) Flashcards
-- - All Quizzes, MCQ/TF Questions & Quiz Attempts
-- - All Calendar Events & Deadlines
-- - All Inbox Items
-- - All Grade Items & Cumulative GPA Calculations
-- - All Focus Sessions & Pomodoro Logs
-- - User App State, Daily Plan, AI Memories & Integrations
-- ==============================================================================

-- 1. Safely drop any older broken tables so column types and constraints are 100% clean
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.inbox_items CASCADE;
DROP TABLE IF EXISTS public.focus_sessions CASCADE;
DROP TABLE IF EXISTS public.grade_items CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.flashcards CASCADE;
DROP TABLE IF EXISTS public.flashcard_decks CASCADE;
DROP TABLE IF EXISTS public.exams CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.notes CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Create Profiles Table
CREATE TABLE public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create Courses Table
CREATE TABLE public.courses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    instructor TEXT DEFAULT '',
    color TEXT DEFAULT '#0284c7',
    location TEXT DEFAULT '',
    credit_hours NUMERIC DEFAULT 3,
    term TEXT DEFAULT '',
    syllabus_url TEXT,
    links JSONB DEFAULT '[]'::jsonb,
    is_archived BOOLEAN DEFAULT false,
    meeting_slots JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_courses_user ON public.courses(user_id);

-- 4. Create Notes Table (Stores 100% of rich lecture notes, markdown, and study guides)
CREATE TABLE public.notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    pinned BOOLEAN DEFAULT false,
    in_trash BOOLEAN DEFAULT false,
    highlighted_terms TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_notes_user ON public.notes(user_id);
CREATE INDEX idx_notes_course ON public.notes(course_id);

-- 5. Create Files Table (Stores full extracted slide text, summaries, and chunks)
CREATE TABLE public.files (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    size_bytes BIGINT DEFAULT 0,
    page_count INTEGER DEFAULT 0,
    raw_text TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    chunks JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'indexed',
    is_favorite BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_files_user ON public.files(user_id);
CREATE INDEX idx_files_course ON public.files(course_id);

-- 6. Create Tasks Table
CREATE TABLE public.tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT,
    assignment_id TEXT,
    exam_id TEXT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    due_date TEXT,
    priority TEXT DEFAULT 'medium',
    tags TEXT[] DEFAULT '{}',
    completed BOOLEAN DEFAULT false,
    completed_at TEXT,
    subtasks JSONB DEFAULT '[]'::jsonb,
    source TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_tasks_user ON public.tasks(user_id);
CREATE INDEX idx_tasks_course ON public.tasks(course_id);

-- 7. Create Assignments Table
CREATE TABLE public.assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT DEFAULT 'homework',
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    due_date TEXT NOT NULL,
    estimated_minutes INTEGER DEFAULT 60,
    submission_url TEXT,
    links TEXT[] DEFAULT '{}',
    steps JSONB DEFAULT '[]'::jsonb,
    is_broken_down BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_assignments_user ON public.assignments(user_id);
CREATE INDEX idx_assignments_course ON public.assignments(course_id);

-- 8. Create Exams Table
CREATE TABLE public.exams (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    weight_percentage NUMERIC DEFAULT 25,
    readiness_percent NUMERIC DEFAULT 0,
    room TEXT DEFAULT '',
    revision_sessions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_exams_user ON public.exams(user_id);
CREATE INDEX idx_exams_course ON public.exams(course_id);

-- 9. Create Flashcard Decks & Flashcards Tables
CREATE TABLE public.flashcard_decks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT,
    name TEXT NOT NULL,
    tag TEXT DEFAULT '',
    cards_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_decks_user ON public.flashcard_decks(user_id);

CREATE TABLE public.flashcards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    deck_id TEXT NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    course_id TEXT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    citation JSONB,
    ease_factor NUMERIC DEFAULT 2.5,
    interval_days INTEGER DEFAULT 0,
    repetitions INTEGER DEFAULT 0,
    lapses INTEGER DEFAULT 0,
    due_date TEXT DEFAULT '',
    state TEXT DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_flashcards_user ON public.flashcards(user_id);
CREATE INDEX idx_flashcards_deck ON public.flashcards(deck_id);

-- 10. Create Quizzes Table
CREATE TABLE public.quizzes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT,
    file_id TEXT,
    note_id TEXT,
    title TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medium',
    questions JSONB DEFAULT '[]'::jsonb,
    attempts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_quizzes_user ON public.quizzes(user_id);

-- 11. Create Calendar Events Table
CREATE TABLE public.calendar_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT,
    assignment_id TEXT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    location TEXT DEFAULT '',
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    all_day BOOLEAN DEFAULT false,
    type TEXT DEFAULT 'event',
    provider TEXT DEFAULT 'local',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_events_user ON public.calendar_events(user_id);

-- 12. Create Grade Items Table
CREATE TABLE public.grade_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    name TEXT NOT NULL,
    score NUMERIC NOT NULL,
    max_score NUMERIC NOT NULL DEFAULT 100,
    weight NUMERIC NOT NULL DEFAULT 10,
    category TEXT DEFAULT 'homework',
    date TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_grade_items_user ON public.grade_items(user_id);

-- 13. Create Focus Sessions Table
CREATE TABLE public.focus_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT,
    task_id TEXT,
    duration_minutes INTEGER NOT NULL,
    actual_minutes INTEGER NOT NULL,
    label TEXT DEFAULT 'Deep Work',
    timestamp TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_focus_sessions_user ON public.focus_sessions(user_id);

-- 14. Create Inbox Items Table
CREATE TABLE public.inbox_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    type TEXT DEFAULT 'note',
    url TEXT,
    email_sender TEXT,
    email_subject TEXT,
    processed BOOLEAN DEFAULT false,
    converted_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
CREATE INDEX idx_inbox_items_user ON public.inbox_items(user_id);

-- 15. Create App State & Complete Workspace Snapshots Table
CREATE TABLE public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_workspace UNIQUE (user_id)
);
CREATE INDEX idx_workspaces_user ON public.workspaces(user_id);

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- Permits seamless synchronization with both public anon key and authenticated users
-- ==============================================================================
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'profiles', 'courses', 'notes', 'files', 'tasks', 
        'assignments', 'exams', 'flashcard_decks', 'flashcards', 
        'quizzes', 'calendar_events', 'grade_items', 'focus_sessions', 
        'inbox_items', 'workspaces'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can manage own %I" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow workspace sync" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Allow workspace sync" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- ENABLE SUPABASE REALTIME ON ALL TABLES (Instant Multi-Device Sync via WebSockets)
-- ==============================================================================
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY['courses', 'notes', 'files', 'tasks', 'assignments', 'exams', 'flashcards', 'workspaces'];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        END IF;
    END LOOP;
END $$;

SELECT '100% of StudyPlanner database tables and Realtime subscriptions created successfully!' AS status;
