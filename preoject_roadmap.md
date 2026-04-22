♟️ Chess Predictor: Project Overview & Roadmap

### The Core Vision

Our goal is to build the "March Madness" for the chess world. We want to create a high-engagement platform  
 where fans can prove their knowledge of top-tier tournaments (like the Candidates, Tata Steel, or Speed Chess  
 Championship) by predicting the final standings.

Instead of just watching, fans now have skin in the game.

────────────────────────────────────────────────────────────────────────────────

### Phase 1: The MVP (Current Status - Mission Accomplished! 🚀)

You have successfully built and deployed a professional, full-stack application.

- The Interface: A smooth, intuitive drag-and-drop experience for ranking chess players.
- Authentication: Secure user accounts so fans can save their own specific predictions.
- The Database: A robust cloud backend (Supabase) that permanently stores predictions.
- Social Proof: A live community leaderboard to see how you stack up against other fans.
- Deployment: Your site is fully live on the internet, ready for users to visit.

────────────────────────────────────────────────────────────────────────────────

### Phase 2: The Future Roadmap (What’s next?)

As your Tech Lead, I have a few ideas on how we can turn this from a fun app into a must-visit destination for
chess fans during every major event.

Here is the natural order of operations:

1.  ✅ The Scoring Engine (Complete): - The Goal: Automate the scoring. Right now, we save the prediction, but we don't know who is winning.
    - How: We write a small script that compares the user's ranked_list in our database against the
      official_results of the tournament. - Result: Users see a "Points Earned" score on their profile. - Implemented: A deterministic scoring formula (3 pts exact, 1 pt off-by-one), a `tournament_results`
      table for storing official standings, a `POST /api/admin/compute-scores` API route that retrieves predictions
      and persists computed scores, leaderboard score display with "Pending" badge and rank ordering, and a user
      profile page showing each prediction's score or "Awaiting Results". - ➡️ Next Recommended: Live Tournament Integration (item 2 below)
2.  ✅ Live Tournament Integration (Complete):
    - The Goal: Keep users engaged during the tournament.
    - How: We connect to the Lichess or Chess.com API to display live scores for the tournament on your site.
    - Result: Your app becomes the "home base" for fans to check results and track their prediction progress.
    - Implemented: A `live_standings` Supabase table with RLS policies for caching standings, an
      `apiTransformer.ts` module that normalises Lichess/Chess.com responses into ranked `PlayerEntry[]` arrays,
      a `poller.ts` service with adaptive interval logic (60-min reduced rate for upcoming, configurable active
      rate, no-op for completed), a `GET /api/cron/poll-standings` Vercel Cron endpoint secured with
      `CRON_SECRET`, a `POST /api/admin/refresh-standings` endpoint for on-demand admin refreshes, automatic
      score computation triggered on tournament completion with idempotency guard (`scored_at`), a
      `/tournament` dashboard page (SSR) showing live standings alongside the authenticated user's prediction,
      a `TournamentStandings` client component with LIVE/Final status badges and per-row prediction
      highlighting, and a `vercel.json` cron schedule (`*/5 * * * *`).
    - ➡️ Next Recommended: Gamification & Profiles (item 3 below)
3.  ✅ Gamification & Profiles (Complete):
    - The Goal: Keep people coming back.
    - How: Add "badges" for correct predictions, and a "Tournament History" page for users to see all their
      past guesses and cumulative points.
    - Result: Users have a persistent profile with cumulative scoring, tournament history, and earned badges.
      The leaderboard now features an all-time cumulative rankings tab.
    - Implemented: A `user_badges` table with RLS policies and a unique constraint preventing duplicate awards,
      a `cumulative_leaderboard` Supabase view computing all-time rankings on-the-fly, a `BadgeEngine`
      (`lib/badgeEngine.ts`) with four badge types (Sharp Eye, Perfect Call, Seasoned Analyst, Podium Finish)
      evaluated and awarded server-side after every score computation, badge evaluation wired into
      `POST /api/admin/compute-scores` returning `{ updated, badgesAwarded, badgesFailed }` counts,
      a refactored `/profile` Server Component showing cumulative score, tournament count, full prediction
      history ordered by date, and a `BadgeGrid` of earned badges with names, descriptions, and tournament
      context, and an extended `/leaderboard` page with a tab switcher — "This Tournament" (existing view)
      and "All Time" (cumulative rankings) — with independent error states per tab.
    - ➡️ Next Recommended: Tournament Creation System (item 4 below)
4.  Tournament Creation System: - The Goal: Let you create new tournaments in 30 seconds. - How: Build a simple "Admin Dashboard" where you can input the player list, start dates, and end dates  
    without touching any code.
