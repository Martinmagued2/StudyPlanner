-- ==============================================================================
-- STUDYPLANNER / NOOK - SUPABASE POSTGRESQL DATABASE SCHEMA
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Go to your Supabase Project Dashboard (https://supabase.com/dashboard)
-- 2. Open the "SQL Editor" from the left menu.
-- 3. Click "New Query", paste this entire script, and click "Run" (Ctrl+Enter).
-- ==============================================================================

-- 1. Create Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version TEXT NOT NULL DEFAULT '1.0.0',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_workspace UNIQUE (user_id)
);

-- 2. Create Index on user_id for high-speed lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 4. Create Security Policies (Users can only access their own workspace)
DROP POLICY IF EXISTS "Users can view their own workspace" ON public.workspaces;
CREATE POLICY "Users can view their own workspace" 
    ON public.workspaces 
    FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own workspace" ON public.workspaces;
CREATE POLICY "Users can insert their own workspace" 
    ON public.workspaces 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own workspace" ON public.workspaces;
CREATE POLICY "Users can update their own workspace" 
    ON public.workspaces 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own workspace" ON public.workspaces;
CREATE POLICY "Users can delete their own workspace" 
    ON public.workspaces 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 5. Enable Realtime on the workspaces table
-- This allows phone and laptop to sync changes in under 100ms via WebSockets!
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
END $$;

-- 6. Trigger to automatically update updated_at timestamp on edit
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER trigger_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Success confirmation message
SELECT 'StudyPlanner database schema and realtime synchronization created successfully!' AS status;

