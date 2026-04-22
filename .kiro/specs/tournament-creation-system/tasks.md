# Implementation Plan: Tournament Creation System

## Overview

Incremental implementation starting with the database schema migration, then the shared auth helper, then API routes, then UI components, and finally wiring everything together. Each step builds on the previous one and can be validated independently.

## Tasks

- [x] 1. Database schema migration and type updates
  - Add `start_date date` and `end_date date` columns to `live_standings` in `supabase/schema.sql`
  - Add optional `source` field and the two new date fields to the `LiveStandings` interface in `lib/types.ts`
  - _Requirements: 2.3_

- [x] 2. Shared admin auth helper
  - [x] 2.1 Create `lib/adminAuth.ts` with `requireAdmin()` function
    - Extract the cookie-reading, Supabase client construction, `getSession()` call, and JWT `role` claim check from the existing `compute-scores` route into a reusable helper
    - Return `{ ok: true, userId }` on success and `{ ok: false, response: NextResponse(403) }` on failure
    - _Requirements: 1.4_

  - [ ]\* 2.2 Write property test for `requireAdmin()` — P1: Non-admin rejection
    - **Property 1: Non-admin requests are always rejected**
    - Generate arbitrary JWT payloads without `role='admin'` (missing field, wrong value, malformed token) and assert every call returns `{ ok: false }` with a 403 response
    - **Validates: Requirements 1.2, 1.4**

  - [ ]\* 2.3 Write unit tests for `requireAdmin()`
    - Mock Supabase client: missing session → `{ ok: false }`, wrong role → `{ ok: false }`, valid admin → `{ ok: true, userId }`
    - _Requirements: 1.4_

- [x] 3. Refactor existing admin routes to use `requireAdmin()`
  - Replace the inline JWT-verification block in `app/api/admin/compute-scores/route.ts` with a call to `requireAdmin()`
  - Replace the inline JWT-verification block in `app/api/admin/refresh-standings/route.ts` with a call to `requireAdmin()`
  - _Requirements: 1.4_

- [ ] 4. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 5. Tournament API routes — list and create
  - [x] 5.1 Create `app/api/admin/tournaments/route.ts` with GET handler
    - Call `requireAdmin()` and return 403 on failure
    - Query `live_standings` ordered by `fetched_at DESC` and return the array as JSON 200
    - _Requirements: 1.4, 4.1_

  - [x] 5.2 Add POST handler to `app/api/admin/tournaments/route.ts`
    - Call `requireAdmin()` and return 403 on failure
    - Parse and validate body: all required fields present, `end_date >= start_date`, `standings.length >= 2`, no duplicate player IDs
    - Return 422 with descriptive message on validation failure
    - Check for existing `tournament_id` in `live_standings`; return 409 if found
    - Insert row with `status = 'upcoming'`, `standings` ranked sequentially, `fetched_at = now()`
    - Return 201 `{ tournament_id }` on success
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]\* 5.3 Write property test for POST handler — P3: Date validation rejects invalid ranges
    - **Property 3: Date validation rejects invalid ranges**
    - Generate arbitrary date pairs where `end_date < start_date` with all other fields valid; assert every response is HTTP 422
    - **Validates: Requirements 2.5, 9.2**

  - [ ]\* 5.4 Write unit tests for POST handler
    - Mock `supabaseAdmin` and `requireAdmin`; test: missing fields → 422, duplicate ID → 409, valid payload → 201
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 6. Tournament API routes — edit and delete
  - [x] 6.1 Create `app/api/admin/tournaments/[id]/route.ts` with PATCH handler
    - Call `requireAdmin()` and return 403 on failure
    - Fetch the existing row; return 404 if not found
    - Return 409 if `status !== 'upcoming'`
    - Validate any provided date fields (`end_date >= start_date`)
    - Update the row with provided fields; re-rank `standings` if provided
    - Return 200 `{ tournament_id }` on success
    - _Requirements: 7.3, 7.4_

  - [x] 6.2 Add DELETE handler to `app/api/admin/tournaments/[id]/route.ts`
    - Call `requireAdmin()` and return 403 on failure
    - Fetch the existing row; return 404 if not found
    - Return 409 if `status !== 'upcoming'`
    - Delete the row and return 200 `{}`
    - _Requirements: 8.3, 8.4_

  - [ ]\* 6.3 Write property test for PATCH handler — P12: Edit blocked for non-upcoming tournaments
    - **Property 12: Edit is blocked for non-upcoming tournaments**
    - Generate arbitrary tournaments with `status` in `['active', 'completed']` and arbitrary PATCH bodies; assert every response is HTTP 409
    - **Validates: Requirements 7.4**

  - [ ]\* 6.4 Write property test for DELETE handler — P13: Delete blocked for non-upcoming tournaments
    - **Property 13: Delete is blocked for non-upcoming tournaments**
    - Generate arbitrary tournaments with `status` in `['active', 'completed']`; assert every DELETE response is HTTP 409
    - **Validates: Requirements 8.4**

  - [ ]\* 6.5 Write unit tests for PATCH and DELETE handlers
    - Mock `supabaseAdmin` and `requireAdmin`; test: not found → 404, non-upcoming → 409, valid → 200
    - _Requirements: 7.3, 7.4, 8.3, 8.4_

- [ ] 7. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 8. Roster utility functions
  - [x] 8.1 Create `components/TournamentForm.tsx` with exported pure roster functions
    - Implement and export `addPlayer(roster, id, name): PlayerEntry[]` — appends player with `rank = roster.length + 1`; throws/returns unchanged if ID is duplicate
    - Implement and export `removePlayer(roster, index): PlayerEntry[]` — removes player at index and calls `assignRanks`
    - Implement and export `reorderPlayers(roster, fromIndex, toIndex): PlayerEntry[]` — moves player and calls `assignRanks`
    - Implement and export `assignRanks(roster): PlayerEntry[]` — sets `rank = index + 1` for every entry
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ]\* 8.2 Write property test for `addPlayer()` — P4: Roster rank invariant after add
    - **Property 4: Roster rank invariant after add**
    - Generate arbitrary rosters (0–20 players) and a new player with a unique ID; assert result has size N+1 and new player has `rank = N+1`
    - **Validates: Requirements 3.2**

  - [ ]\* 8.3 Write property test for `removePlayer()` — P5: Roster rank invariant after remove
    - **Property 5: Roster rank invariant after remove**
    - Generate arbitrary rosters (2–20 players) and a valid removal index; assert result has size N−1 and every remaining player's `rank = index + 1`
    - **Validates: Requirements 3.3**

  - [ ]\* 8.4 Write property test for `reorderPlayers()` — P6: Roster rank invariant after reorder
    - **Property 6: Roster rank invariant after reorder**
    - Generate arbitrary rosters and arbitrary `fromIndex`/`toIndex` pairs; assert every player's `rank = index + 1` in the result
    - **Validates: Requirements 3.4**

  - [ ]\* 8.5 Write property test for `addPlayer()` — P7: Duplicate player ID is always rejected
    - **Property 7: Duplicate player ID is always rejected**
    - Generate arbitrary rosters containing a player with ID `X`; attempt to add another player with the same ID; assert roster is unchanged and a validation error is produced
    - **Validates: Requirements 3.5**

  - [ ]\* 8.6 Write unit tests for roster utility functions
    - Test `addPlayer`: empty roster, single player, boundary; `removePlayer`: first, last, middle; `reorderPlayers`: swap adjacent, move to end; `assignRanks`: already sequential, out-of-order
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 9. TournamentForm component
  - [x] 9.1 Complete `TournamentForm` React client component
    - Add controlled form state for all text/date/select inputs using `TournamentFormValues`
    - Wire roster state to `addPlayer`, `removePlayer`, `reorderPlayers` (use `@dnd-kit/sortable` for drag-and-drop reorder, already in dependencies)
    - Implement `validate()` — checks all required fields, `end_date >= start_date`, `roster.length >= 2`, no duplicate IDs; returns field-level errors
    - On submit: run validation, disable submit button (`submitting = true`), call POST or PATCH API route, handle success (call `onSuccess`, reset form) and error (set `serverError`)
    - Accept `initialValues` and `tournamentId` props to support edit mode (pre-populate all fields)
    - Display each player's rank, ID, and name in the roster list
    - _Requirements: 2.1, 2.2, 2.8, 2.9, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.2, 9.1, 9.2, 9.3, 9.4_

  - [ ]\* 9.2 Write property test for `TournamentForm` — P15: Form validation blocks submission on invalid input
    - **Property 15: Form validation blocks submission on invalid input**
    - Generate arbitrary combinations of missing/invalid required fields (empty name, missing source, missing ID, missing dates, roster < 2); assert `validate()` returns errors and the API is never called
    - **Validates: Requirements 9.1, 9.3**

  - [ ]\* 9.3 Write property test for `TournamentForm` — P16: Submit button disabled during in-flight submission
    - **Property 16: Submit button is disabled during in-flight submission**
    - For any form state where `submitting = true`, assert the submit button has the `disabled` attribute
    - **Validates: Requirements 9.4**

  - [ ]\* 9.4 Write unit tests for `TournamentForm` validation
    - Test: all fields empty → errors on every required field; `end_date < start_date` → error on end date field; zero players → roster error; valid data → no errors
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 10. TournamentList component
  - [x] 10.1 Create `components/TournamentList.tsx` client component
    - Accept `initialTournaments: LiveStandings[]` prop; store in local state
    - Render each tournament row with `tournament_name`, `tournament_id`, `status` (with visual badge distinguishing `active`), and `fetched_at`
    - Render per-row actions conditionally based on status: `upcoming` → Edit + Delete + Refresh; `active` → Refresh only; `completed` → Compute Scores only
    - Edit action: set `editTarget` and open `TournamentForm` in a Dialog pre-populated with the tournament's values
    - Delete action: set `deleteTarget` and show confirmation Dialog; on confirm call DELETE API, remove from local state on success
    - Refresh action: call `POST /api/admin/refresh-standings` with `tournament_id`; update `fetched_at` in local state on success; show per-row error on failure
    - Compute Scores action: call `POST /api/admin/compute-scores` with `tournamentName`; display returned counts on success; show error on failure
    - After successful create/edit/delete, update local `tournaments` state without full page reload
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.6, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 8.1, 8.2, 8.5_

  - [ ]\* 10.2 Write property test for `TournamentList` — P9: Tournament list ordering
    - **Property 9: Tournament list ordering**
    - Generate arbitrary arrays of tournaments with distinct `fetched_at` timestamps; render `TournamentList` and assert rows appear in strictly descending `fetched_at` order
    - **Validates: Requirements 4.1**

  - [ ]\* 10.3 Write property test for `TournamentList` — P11: Status-conditional action visibility
    - **Property 11: Status-conditional action visibility**
    - Generate arbitrary tournaments with each of the three statuses; render the row and assert exactly the correct set of action buttons is present/absent per the status matrix
    - **Validates: Requirements 4.3, 5.1, 6.1, 7.1, 8.1**

  - [ ]\* 10.4 Write unit tests for `TournamentList`
    - Test: row displays all required fields; Edit/Delete absent for active/completed; Refresh absent for completed; Compute Scores absent for upcoming/active
    - _Requirements: 4.2, 4.3, 5.1, 6.1, 7.1, 8.1_

- [x] 11. Admin page — server component
  - Create `app/admin/page.tsx` as a Next.js server component
  - Call `requireAdmin()` server-side; redirect to `/login` if unauthenticated, return 403 response if authenticated but not admin
  - Fetch initial tournament list directly from `supabaseAdmin` (no API round-trip), ordered by `fetched_at DESC`
  - Render `<TournamentList initialTournaments={...} />` and a "New Tournament" button that opens `<TournamentForm />` in a shadcn Dialog
  - _Requirements: 1.1, 1.2, 1.3, 4.1_

- [ ] 12. Final checkpoint — Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` (must be added as a dev dependency: `npm install --save-dev fast-check vitest @vitejs/plugin-react`)
- Tag each property test with `// Feature: tournament-creation-system, Property N: <property text>`
- Properties P2, P8, P10, P14 are covered by example-based unit tests (see design.md for rationale)
- The `@dnd-kit/sortable` package is already in `dependencies` — use it for drag-to-reorder in `TournamentForm`
