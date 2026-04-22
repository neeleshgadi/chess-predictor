# Implementation Plan: Live Tournament Integration

## Overview

Implement the live tournament integration incrementally: database schema first, then the transformation and polling core, then the API endpoints, then the dashboard UI, and finally wire everything together with the cron job and Vercel config.

## Tasks

- [x] 1. Add `TournamentStatus` and `LiveStandings` types to `lib/types.ts`
  - Add `TournamentStatus = "upcoming" | "active" | "completed"` union type
  - Add `LiveStandings` interface with fields: `id`, `tournament_id`, `tournament_name`, `standings: PlayerEntry[]`, `status: TournamentStatus`, `fetched_at`, `scored_at`
  - _Requirements: 2.1, 7.2_

- [x] 2. Create `live_standings` Supabase migration
  - [x] 2.1 Add `live_standings` table DDL to `supabase/schema.sql`
    - Include `tournament_id` UNIQUE constraint, `standings` JSONB column, `status` CHECK constraint, `fetched_at`, and `scored_at` columns
    - Add RLS policies: public SELECT, service-role ALL
    - _Requirements: 2.1, 2.2_

- [x] 3. Implement `lib/apiTransformer.ts`
  - [x] 3.1 Create `TransformError` class and `transformApiResponse` function
    - Accept `raw: unknown` and `source: "lichess" | "chessdotcom"`
    - Assign consecutive integer ranks starting at 1 to valid entries
    - Discard entries with missing or non-positive ranks and log a warning with the player identifier
    - Throw `TransformError` for unrecognisable response shapes
    - _Requirements: 1.2, 7.1, 7.4_

  - [ ]\* 3.2 Write property test for `transformApiResponse` — Property 1: Transformation Correctness
    - **Property 1: Transformation Correctness** — for any valid API payload, output ranks are consecutive integers starting at 1 with no gaps or duplicates; entries with missing/non-positive source ranks are absent
    - **Validates: Requirements 1.2, 7.1, 7.4**
    - Use `fast-check` with arbitrary raw payloads mixing valid and invalid entries
    - Tag: `// Feature: live-tournament-integration, Property 1: Transformation Correctness`

  - [ ]\* 3.3 Write property test for `PlayerEntry[]` serialization — Property 2: Serialization Round-Trip
    - **Property 2: Serialization Round-Trip** — `JSON.parse(JSON.stringify(arr))` is deeply equal to the original `PlayerEntry[]`
    - **Validates: Requirements 7.2**
    - Use `fast-check` with arbitrary `PlayerEntry[]` arrays
    - Tag: `// Feature: live-tournament-integration, Property 2: Serialization Round-Trip`

  - [ ]\* 3.4 Write unit tests for `transformApiResponse`
    - Test known Lichess response shape (happy path)
    - Test known Chess.com response shape (happy path)
    - Test response with one invalid entry (missing rank) — entry discarded, rest ranked correctly
    - Test completely unrecognisable shape — `TransformError` thrown
    - _Requirements: 1.2, 7.1, 7.4_

- [x] 4. Implement `lib/poller.ts` — core polling logic
  - [x] 4.1 Implement `pollStandings(tournamentId: string): Promise<PollResult>`
    - Read current `live_standings` row from Supabase via `supabaseAdmin`
    - Apply adaptive interval logic: return `skipped` if status is `completed`, or if status is `upcoming` and < 60 min elapsed, or if status is `active` and < `POLL_INTERVAL_MINUTES` elapsed
    - Fetch from External_API with a 10-second `AbortController` timeout
    - Call `transformApiResponse` to produce `PlayerEntry[]`
    - Upsert `live_standings` with updated standings, status, and `fetched_at`
    - On `completed` transition: insert into `tournament_results`, then POST to `/api/admin/compute-scores`, then set `scored_at` only on success
    - On any External_API or transform error: log and return `{ status: "error" }`; do NOT overwrite cached standings
    - Read `POLL_INTERVAL_MINUTES` from env; if < 1, log error and default to 5
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]\* 4.2 Write property test for adaptive interval skip — Property 4: Adaptive Interval Skip
    - **Property 4: Adaptive Interval Skip** — for any `(status, fetchedAt, elapsedMinutes)` where elapsed < applicable interval, `pollStandings` returns `skipped` without calling the External_API
    - **Validates: Requirements 6.2, 6.3**
    - Mock Supabase read; assert no HTTP fetch is issued
    - Tag: `// Feature: live-tournament-integration, Property 4: Adaptive Interval Skip`

  - [ ]\* 4.3 Write property test for completed tournament no-op — Property 5: Completed Tournament No-Op
    - **Property 5: Completed Tournament No-Op** — for any `live_standings` row with status `completed`, `pollStandings` always returns `skipped` regardless of elapsed time
    - **Validates: Requirements 6.4**
    - Tag: `// Feature: live-tournament-integration, Property 5: Completed Tournament No-Op`

  - [ ]\* 4.4 Write property test for cache preservation on failure — Property 3: Cache Preservation on Failure
    - **Property 3: Cache Preservation on Failure** — for any existing `live_standings` row and any HTTP 4xx/5xx or timeout, the row in Supabase is identical after the failed poll
    - **Validates: Requirements 1.3, 1.4**
    - Mock HTTP to return arbitrary error codes (400–599) or simulate timeout
    - Tag: `// Feature: live-tournament-integration, Property 3: Cache Preservation on Failure`

  - [ ]\* 4.5 Write property test for idempotent score computation — Property 6: Idempotent Score Computation
    - **Property 6: Idempotent Score Computation** — for any `live_standings` row with non-null `scored_at`, calling `pollStandings` any number of times does NOT invoke `POST /api/admin/compute-scores`
    - **Validates: Requirements 5.4**
    - Tag: `// Feature: live-tournament-integration, Property 6: Idempotent Score Computation`

  - [ ]\* 4.6 Write property test for standings upsert completeness — Property 7: Standings Upsert Completeness
    - **Property 7: Standings Upsert Completeness** — for any successful fetch returning a non-empty `PlayerEntry[]`, the upserted `live_standings` row contains the correct `tournament_id`, full standings, valid status, and `fetched_at` ≥ pre-fetch timestamp
    - **Validates: Requirements 2.1**
    - Tag: `// Feature: live-tournament-integration, Property 7: Standings Upsert Completeness`

  - [ ]\* 4.7 Write property test for completion write fidelity — Property 10: Completion Write Fidelity
    - **Property 10: Completion Write Fidelity** — for any standings array that triggers a `completed` transition, the `final_standings` written to `tournament_results` is deeply equal to the fetched `PlayerEntry[]`
    - **Validates: Requirements 5.1**
    - Tag: `// Feature: live-tournament-integration, Property 10: Completion Write Fidelity`

  - [ ]\* 4.8 Write unit tests for `pollStandings` edge cases
    - Test 10-second timeout scenario: External_API hangs → cached standings unchanged, returns `error`
    - Test Score_Engine POST failure: `scored_at` not set, returns `error`
    - Test `POLL_INTERVAL_MINUTES` < 1: defaults to 5 minutes
    - _Requirements: 1.4, 5.3, 6.5_

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement `app/api/cron/poll-standings/route.ts`
  - [x] 6.1 Create GET handler for Vercel Cron
    - Validate `Authorization: Bearer <CRON_SECRET>` header; return 401 if missing or invalid
    - Read `TOURNAMENT_ID` from env; throw descriptive error if missing
    - Call `pollStandings(tournamentId)` and return 200 on success, 500 on error
    - _Requirements: 1.1, 6.1_

  - [ ]\* 6.2 Write unit tests for cron endpoint
    - Test valid `CRON_SECRET` → 200
    - Test missing/invalid `CRON_SECRET` → 401
    - _Requirements: 1.1_

- [x] 7. Implement `app/api/admin/refresh-standings/route.ts`
  - [x] 7.1 Create POST handler for admin on-demand refresh
    - Validate admin JWT using the same cookie-based pattern as `compute-scores/route.ts`
    - Return 403 with `{ error: "Forbidden: admin role required" }` for non-admin callers
    - Call `pollStandings(tournamentId)` bypassing the interval check (pass a `force` flag or call directly)
    - Return 200 `{ fetchedAt }` on success, 502 `{ error }` on poller error
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]\* 7.2 Write unit tests for admin refresh endpoint
    - Test unauthenticated caller → 403
    - Test non-admin JWT → 403
    - Test admin caller, poller succeeds → 200 with `fetchedAt`
    - Test admin caller, poller returns error → 502
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 8. Implement `components/TournamentStandings.tsx`
  - [x] 8.1 Create client component with standings list and prediction highlighting
    - Accept props: `standings: PlayerEntry[]`, `userPrediction: PlayerEntry[] | null`, `status: TournamentStatus`
    - Sort and render players in ascending rank order (rank 1 first)
    - Show "LIVE" badge when `status === "active"`, "Final" indicator when `status === "completed"`
    - Visually distinguish rows where the user's predicted rank matches or is within 1 of the live rank
    - _Requirements: 3.2, 3.5, 3.6, 3.7, 7.3_

  - [ ]\* 8.2 Write property test for standings rendered in rank order — Property 8: Standings Rendered in Rank Order
    - **Property 8: Standings Rendered in Rank Order** — for any `PlayerEntry[]` passed in any order, the rendered output displays players in ascending rank order and includes each player's rank and name
    - **Validates: Requirements 3.2, 7.3**
    - Use `@testing-library/react` + `fast-check` with arbitrary `PlayerEntry[]` in random order
    - Tag: `// Feature: live-tournament-integration, Property 8: Standings Rendered in Rank Order`

  - [ ]\* 8.3 Write property test for prediction highlighting — Property 9: Prediction Highlighting Correctness
    - **Property 9: Prediction Highlighting Correctness** — for any standings and any user prediction, exactly those rows where predicted rank matches live rank exactly or differs by 1 are visually distinguished
    - **Validates: Requirements 3.7**
    - Tag: `// Feature: live-tournament-integration, Property 9: Prediction Highlighting Correctness`

  - [ ]\* 8.4 Write unit tests for `TournamentStandings`
    - Test `active` status renders "LIVE" badge
    - Test `completed` status renders "Final" indicator and no "LIVE" badge
    - Test `null` prediction renders no highlighting
    - _Requirements: 3.5, 3.6, 3.7_

- [x] 9. Implement `app/tournament/page.tsx` — Tournament Dashboard
  - [x] 9.1 Create server component at `/tournament` route
    - Use `supabaseAdmin` to read the `live_standings` row for `TOURNAMENT_ID`
    - If no row exists, render "Standings not yet available" message
    - Read the authenticated user's most recent prediction from `predictions` table (if session present)
    - If unauthenticated, render standings with a login prompt in place of the prediction panel
    - Pass data to `TournamentStandings` client component
    - Set `export const revalidate = 0` for SSR with no caching
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [ ]\* 9.2 Write unit tests for tournament page
    - Test no cached row → "Standings not yet available" rendered
    - Test unauthenticated user → login prompt rendered, standings visible
    - Test `active` status → `TournamentStandings` receives `status="active"`
    - Test `completed` status → `TournamentStandings` receives `status="completed"`
    - _Requirements: 2.4, 3.3, 3.4, 3.5, 3.6_

- [x] 10. Add `vercel.json` cron configuration
  - Create or update `vercel.json` with a cron entry for `/api/cron/poll-standings` on a `*/5 * * * *` schedule
  - _Requirements: 6.1_

- [ ] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations per property
- `supabaseAdmin` (service role) is used for all server-side writes; the public anon client is used only for client-side reads
- The `scored_at` idempotency guard on `live_standings` prevents double-scoring across poll cycles
