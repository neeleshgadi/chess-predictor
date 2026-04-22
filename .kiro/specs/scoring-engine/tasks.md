# Implementation Plan: Scoring Engine

## Overview

Implement the server-side scoring engine that evaluates user predictions against official tournament results, persists scores, and surfaces them on the leaderboard and a new user profile page.

## Tasks

- [x] 1. Set up shared types and database schema
  - Create `lib/types.ts` with `PlayerEntry`, `Prediction`, and `TournamentResult` interfaces
  - Add the `tournament_results` table migration to `supabase/schema.sql` (columns: `id`, `tournament_name`, `final_standings`, `created_at`; constraints: non-empty name, non-empty JSONB array; RLS policies for admin write and public read)
  - Add `ALTER TABLE predictions ADD COLUMN score integer DEFAULT NULL` to `supabase/schema.sql`
  - Add RLS policy preventing public clients from updating the `score` column
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.3, 4.4_

- [x] 2. Implement the pure scoring function
  - [x] 2.1 Create `lib/scoring.ts` with `computeScore(rankedList, officialStandings)` function
    - Build a `{ [playerId]: officialRank }` lookup map from `officialStandings`
    - Iterate `rankedList`; award 3 pts for exact match, 1 pt for off-by-one, 0 pts otherwise
    - Players absent from official standings receive 0 points
    - Return total as a non-negative integer
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.6_

  - [ ]\* 2.2 Write property test: score is always in range [0, 3N]
    - **Property: Score bounds**
    - **Validates: Requirements 7.1, 7.5**

  - [ ]\* 2.3 Write property test: idempotence — same inputs always produce same score
    - **Property: Determinism / idempotence**
    - **Validates: Requirements 7.2**

  - [ ]\* 2.4 Write property test: perfect prediction scores 3 × N
    - **Property: Perfect prediction**
    - **Validates: Requirements 7.3**

  - [ ]\* 2.5 Write property test: all-shifted-by-two prediction scores 0
    - **Property: Zero score for large offsets**
    - **Validates: Requirements 7.4**

  - [ ]\* 2.6 Write unit tests for `computeScore`
    - Test exact match, off-by-one, and no-match cases individually
    - Test player absent from official standings returns 0 for that player
    - Test empty ranked list returns 0
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 3.6_

- [x] 3. Checkpoint — Ensure all scoring tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create the server-side Supabase admin client
  - Create `lib/supabase-server.ts` using `SUPABASE_SERVICE_ROLE_KEY`
  - Export `supabaseAdmin` client (never import this in browser code)
  - _Requirements: 4.4_

- [x] 5. Implement the compute-scores API route
  - [x] 5.1 Create `app/api/admin/compute-scores/route.ts` (POST handler)
    - Parse `{ tournamentName }` from request body
    - Verify caller has `admin` role via Supabase JWT claim; return 403 if not
    - Fetch `tournament_results` row for `tournamentName`; return 404 with descriptive error if not found — do not modify any predictions
    - Fetch all rows from `predictions`
    - Call `computeScore` for each prediction using the official standings
    - Batch-update `predictions.score` via `supabaseAdmin`
    - Return `{ updated: N }` on success
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.2, 4.4_

  - [ ]\* 5.2 Write unit tests for the API route handler
    - Test 403 when caller is not admin
    - Test 404 when tournament not found (assert no predictions are modified)
    - Test successful path returns correct `updated` count
    - _Requirements: 3.5, 3.1, 3.4_

- [x] 6. Update the leaderboard page
  - Modify `app/leaderboard/page.tsx` to order by `score DESC NULLS LAST, created_at ASC`
  - Display numeric score on each prediction card; show "Pending" badge when score is `null`
  - Add rank position numbers (1st, 2nd, 3rd…) based on sorted order
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Create the user profile page
  - Create `app/profile/page.tsx` that fetches predictions for the logged-in user
  - Display tournament name, score (or "Awaiting Results" if `null`), and submitted ranked list for each prediction
  - Redirect unauthenticated users to `/login`
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Update project roadmap
  - Open `D:\project_11\preoject_roadmap.md`
  - Mark Phase 2 item 1 (Scoring Engine) as complete with a ✅ status
  - Add a brief summary of what was implemented: scoring formula, `tournament_results` table, compute-scores API route, leaderboard score display, and user profile page
  - Note the next recommended phase item (Live Tournament Integration)

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- `supabaseAdmin` (service role) must only be used in server-side API routes — never in client components
- Property tests validate universal correctness properties of the scoring formula
- Unit tests validate specific examples and edge cases
