-- Add tournament_name column to predictions table
ALTER TABLE predictions ADD COLUMN tournament_name text NOT NULL DEFAULT '';

-- Update the cumulative_leaderboard view to use the new column
DROP VIEW IF EXISTS cumulative_leaderboard;

CREATE VIEW cumulative_leaderboard AS
SELECT
  user_name,
  COALESCE(SUM(score), 0)          AS cumulative_score,
  COUNT(DISTINCT tournament_name)  AS tournaments_played
FROM predictions
WHERE score IS NOT NULL
GROUP BY user_name
ORDER BY cumulative_score DESC, tournaments_played DESC;
