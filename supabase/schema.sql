-- Create a table to store user predictions
create table predictions (
  id uuid default gen_random_uuid() primary key,
  user_name text not null, -- The name of the person predicting
  ranked_list jsonb not null, -- The final sorted list of chess players
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Allow anyone to insert a prediction (for our MVP testing)
alter table predictions enable row level security;
create policy "Allow public inserts" on predictions for insert with check (true);
create policy "Allow public read" on predictions for select using (true);

-- tournament_results table for storing official final standings
CREATE TABLE tournament_results (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_name  text NOT NULL CHECK (char_length(tournament_name) > 0),
  final_standings  jsonb NOT NULL,
  created_at       timestamp with time zone DEFAULT timezone('utc', now()) NOT NULL,
  CONSTRAINT final_standings_non_empty CHECK (jsonb_array_length(final_standings) > 0)
);

ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin insert" ON tournament_results
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin update" ON tournament_results
  FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Public read" ON tournament_results
  FOR SELECT USING (true);

-- Add score column to predictions
ALTER TABLE predictions ADD COLUMN score integer DEFAULT NULL;

-- Prevent public clients from updating the score column
CREATE POLICY "No public score update" ON predictions
  FOR UPDATE USING (false);

-- live_standings table for caching live tournament data from external chess APIs
CREATE TABLE live_standings (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id     text NOT NULL UNIQUE,
  tournament_name   text NOT NULL,
  standings         jsonb NOT NULL DEFAULT '[]',
  status            text NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming', 'active', 'completed')),
  fetched_at        timestamp with time zone NOT NULL,
  scored_at         timestamp with time zone DEFAULT NULL,
  start_date        date DEFAULT NULL,
  end_date          date DEFAULT NULL
);

ALTER TABLE live_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON live_standings FOR SELECT USING (true);

CREATE POLICY "Service write" ON live_standings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user_badges table for persisting badge awards (Requirements 5.1, 5.2, 5.3, 5.4)
CREATE TABLE user_badges (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type     text NOT NULL CHECK (badge_type IN (
                   'sharp_eye', 'perfect_call', 'seasoned_analyst', 'podium_finish'
                 )),
  tournament_id  text REFERENCES live_standings(tournament_id) ON DELETE SET NULL,
  awarded_at     timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_user_badge_tournament UNIQUE (user_id, badge_type, tournament_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Users can only read their own badges
CREATE POLICY "Users read own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update badges
CREATE POLICY "Service write badges" ON user_badges
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- cumulative_leaderboard view for all-time rankings (Requirements 6.1, 6.2, 6.3, 6.4)
CREATE VIEW cumulative_leaderboard AS
SELECT
  user_name,
  COALESCE(SUM(score), 0)          AS cumulative_score,
  COUNT(DISTINCT tournament_name)  AS tournaments_played
FROM predictions
WHERE score IS NOT NULL
GROUP BY user_name
ORDER BY cumulative_score DESC, tournaments_played DESC;

-- Add start_date and end_date columns to live_standings (Requirements 2.3)
ALTER TABLE live_standings ADD COLUMN IF NOT EXISTS start_date date DEFAULT NULL;
ALTER TABLE live_standings ADD COLUMN IF NOT EXISTS end_date date DEFAULT NULL;
