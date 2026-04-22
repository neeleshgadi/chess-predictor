# Implementation Plan: Gamification & Profiles

## Overview

Implement persistent user profiles with cumulative scoring, tournament history, achievement badges, and an all-time leaderboard tab. The work is broken into discrete steps: database schema, type extensions, badge engine, profile page refactor, leaderboard tab extension, and wiring the badge engine into the existing compute-scores route.

## Tasks

- [x] 1. Apply database migrations
  - Add the `user_badges` table with RLS policies and unique constraint to `supabase/schema.sql`
  - Add the `cumulative_leaderboard` view to `supabase/schema.sql`
  - _Requirements: 5.1, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4_

- [x] 2. Extend TypeScript types in `lib/types.ts`
  - Add `BadgeType` union type, `UserBadge` interface, `CumulativeLeaderboardEntry` interface, and `BADGE_METADATA` constant as specified in the design
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.3_

- [x] 3. Implement `lib/badgeEngine.ts`
  - [x] 3.1 Implement pure badge condition checkers
    - Write `checkSharpEye(prediction, officialStandings): boolean` — returns true iff any player in the prediction occupies the same rank in official standings
    - Write `checkPerfectCall(prediction, officialStandings): boolean` — returns true iff `computeScore` equals `3 × officialStandings.length`
    - Write `checkSeasonedAnalyst(allUserPredictions): boolean` — returns true iff distinct `tournament_name` count ≥ 3
    - Write `checkPodiumFinish(userName, tournamentLeaderboard): boolean` — returns true iff user's rank in leaderboard sorted by score desc is ≤ 3
    - Export `BadgeAwardContext` interface and `BadgeType` re-export
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ]\* 3.2 Write property test for `checkSharpEye` (Property 4)
    - **Property 4: Sharp Eye badge condition — exact rank match**
    - **Validates: Requirements 3.2**

  - [ ]\* 3.3 Write property test for `checkPerfectCall` (Property 5)
    - **Property 5: Perfect Call badge condition — maximum possible score**
    - **Validates: Requirements 3.3**

  - [ ]\* 3.4 Write property test for `checkSeasonedAnalyst` (Property 6)
    - **Property 6: Seasoned Analyst badge condition — three or more distinct tournaments**
    - **Validates: Requirements 3.4**

  - [ ]\* 3.5 Write property test for `checkPodiumFinish` (Property 7)
    - **Property 7: Podium Finish badge condition — top-3 leaderboard rank**
    - **Validates: Requirements 3.5**

  - [x] 3.6 Implement `evaluateAndAwardBadges(ctx, supabaseAdmin)`
    - Call each condition checker; for each truthy result, upsert a row into `user_badges` using the unique constraint to make the operation idempotent (catch duplicate-key errors as no-ops)
    - Log server-side on unexpected Supabase errors; do not throw (badge failures must not roll back score updates)
    - _Requirements: 3.1, 3.6, 5.1, 5.2, 5.3_

  - [ ]\* 3.7 Write property test for badge award idempotency (Property 8)
    - **Property 8: Badge award idempotency — no duplicate records**
    - **Validates: Requirements 3.6, 5.3**

- [ ] 4. Checkpoint — Ensure all badge engine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Wire `evaluateAndAwardBadges` into `app/api/admin/compute-scores/route.ts`
  - After the successful `upsert` of scores, build a `BadgeAwardContext` for each user who has a prediction in the tournament and call `evaluateAndAwardBadges`
  - Fetch the tournament leaderboard (predictions for this tournament sorted by score desc) to populate `tournamentLeaderboard`
  - Fetch all scored predictions per user to populate `allUserPredictions`
  - Return a response that includes `{ updated, badgesAwarded, badgesFailed }` counts
  - _Requirements: 3.1, 3.6_

- [x] 6. Implement profile page sub-components
  - [x] 6.1 Create `components/ProfileStats.tsx`
    - Accept `cumulativeScore: number` and `tournamentsPlayed: number` as props
    - Render cumulative score and tournament count; show 0 when no scored predictions
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 6.2 Create `components/BadgeChip.tsx`
    - Accept a `UserBadge` and optional `tournamentName: string | null` as props
    - Render badge name, description from `BADGE_METADATA`, and tournament name when non-null
    - Use the existing `Badge` component from `components/ui/badge.tsx` as a base
    - _Requirements: 4.3, 4.4_

  - [x] 6.3 Create `components/BadgeGrid.tsx`
    - Accept `badges: UserBadge[]` and a `tournamentNames: Record<string, string>` lookup as props
    - Render one `BadgeChip` per badge; render a "no badges yet" message when the array is empty
    - _Requirements: 4.1, 4.2_

  - [ ]\* 6.4 Write property test for badge rendering completeness (Property 9)
    - **Property 9: Badge rendering completeness — all earned badges displayed with full metadata**
    - **Validates: Requirements 4.1, 4.3, 4.4**

- [x] 7. Refactor `app/profile/page.tsx` to a Server Component
  - Convert from `"use client"` to a Next.js App Router Server Component using `supabase-server.ts`
  - Fetch the authenticated user's session server-side; redirect to `/login` if unauthenticated
  - Fetch predictions ordered by `created_at` descending; compute `cumulativeScore` and `tournamentsPlayed` from the result set
  - Fetch `user_badges` for the user; resolve tournament names from `live_standings` or `tournament_results`
  - Compose `ProfileStats`, `TournamentHistoryList` (inline or extracted component), and `BadgeGrid` into the page
  - Render error fallback if predictions query fails; render "badges unavailable" fallback if badges query fails independently
  - Fall back to raw `tournament_name` string if a join to `live_standings` returns no match
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4_

  - [ ]\* 7.1 Write property test for prediction list ordering (Property 1)
    - **Property 1: Prediction list is ordered by submission date descending**
    - **Validates: Requirements 1.1**

  - [ ]\* 7.2 Write property test for cumulative score computation (Property 2)
    - **Property 2: Cumulative score equals sum of non-null prediction scores**
    - **Validates: Requirements 2.1, 2.2**

  - [ ]\* 7.3 Write property test for tournament participation count (Property 3)
    - **Property 3: Tournament participation count equals distinct tournament names**
    - **Validates: Requirements 2.4, 6.4**

- [ ] 8. Checkpoint — Ensure profile page renders correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Extend `app/leaderboard/page.tsx` with the All-Time tab
  - Add a tab switcher UI (e.g., two buttons or a `<Tabs>` component) defaulting to the existing per-tournament view
  - Add an "All Time" tab that queries the `cumulative_leaderboard` Supabase view and renders each entry with `user_name`, `cumulative_score`, and `tournaments_played`
  - Render an error state for the All-Time tab independently if the view query fails, without affecting the per-tournament tab
  - Handle an empty result set gracefully (users with no scored predictions are excluded from the view)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]\* 9.1 Write property test for cumulative leaderboard ordering invariant (Property 10)
    - **Property 10: Cumulative leaderboard ordering invariant**
    - **Validates: Requirements 6.1, 6.2**

- [ ] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations per property
- Badge failures in the compute-scores route are best-effort and do not roll back score updates
- The `cumulative_leaderboard` view is computed on-the-fly from `predictions` — no separate sync step needed
