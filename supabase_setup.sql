-- 1. Create the app_state table
CREATE TABLE IF NOT EXISTS app_state (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  state JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for users to manage their own data
CREATE POLICY "Allow users to view their own state"
ON app_state FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own state"
ON app_state FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own state"
ON app_state FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own state"
ON app_state FOR DELETE
USING (auth.uid() = user_id);

-- Optional: Create an index on the user_id for faster lookups (already implicit on PRIMARY KEY, but good practice if not)
-- CREATE INDEX IF NOT EXISTS app_state_user_id_idx ON app_state(user_id);
