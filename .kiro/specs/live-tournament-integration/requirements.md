# Requirements Document

## Introduction

The Live Tournament Integration feature connects the Chess Predictor app to an external chess API (Lichess or Chess.com) to display live and final tournament standings directly on the site. During an active tournament, users can see real-time standings updates alongside their own predictions, making the app the "home base" for fans to track results and measure their prediction accuracy as the event unfolds. Once a tournament concludes, the fetched standings are persisted as the official result and used to trigger score computation.

## Glossary

- **Tournament_Poller**: The server-side service responsible for fetching standings data from the external chess API on a scheduled or on-demand basis.
- **External_API**: The third-party chess data provider (Lichess or Chess.com) whose tournament endpoint is queried for live standings.
- **Live_Standings**: The current ranked list of players as returned by the External_API for an in-progress or recently completed tournament.
- **Tournament_Dashboard**: The new page (`/tournament`) that displays live standings and the authenticated user's prediction side-by-side.
- **Score_Engine**: The existing scoring service invoked via `POST /api/admin/compute-scores` that computes prediction scores against official standings.
- **Cached_Standings**: A copy of the most recently fetched Live_Standings stored in Supabase to reduce External_API calls and serve fast page loads.
- **Tournament_Status**: An enumerated state of a tournament: `upcoming`, `active`, or `completed`.
- **Admin**: An authenticated Supabase user whose JWT contains `role = 'admin'`.
- **Player_Entry**: An object with fields `id` (string), `name` (string), and `rank` (integer ≥ 1), matching the existing `PlayerEntry` type in `lib/types.ts`.

---

## Requirements

### Requirement 1: External API Data Fetching

**User Story:** As a fan, I want the app to pull live tournament standings from a chess API, so that I can see up-to-date results without leaving the site.

#### Acceptance Criteria

1. WHEN the Tournament_Poller is invoked, THE Tournament_Poller SHALL request the current standings for the configured tournament from the External_API.
2. WHEN the External_API returns a successful response, THE Tournament_Poller SHALL transform the response into an ordered array of Player_Entry objects ranked from 1 to N.
3. IF the External_API returns an HTTP error status (4xx or 5xx), THEN THE Tournament_Poller SHALL log the error with the status code and retain the most recent Cached_Standings without overwriting them.
4. IF the External_API does not respond within 10 seconds, THEN THE Tournament_Poller SHALL time out the request, log a timeout error, and retain the most recent Cached_Standings.
5. THE Tournament_Poller SHALL support configuration of the External_API endpoint URL and tournament identifier via environment variables, without requiring a code change.

---

### Requirement 2: Standings Caching in Supabase

**User Story:** As a fan, I want the app to load standings quickly, so that I am not waiting on a slow external API every time I visit the page.

#### Acceptance Criteria

1. WHEN the Tournament_Poller successfully fetches Live_Standings, THE Tournament_Poller SHALL upsert the standings into a `live_standings` Supabase table, storing the tournament identifier, the Player_Entry array as JSONB, the Tournament_Status, and the fetch timestamp.
2. THE `live_standings` table SHALL enforce a unique constraint on the tournament identifier so that each tournament has exactly one cached row.
3. WHEN a page request is made for the Tournament_Dashboard, THE Tournament_Dashboard SHALL read standings from the `live_standings` Supabase table rather than calling the External_API directly.
4. IF no cached row exists for the requested tournament, THEN THE Tournament_Dashboard SHALL display a "Standings not yet available" message to the user.

---

### Requirement 3: Tournament Dashboard Page

**User Story:** As a fan, I want a dedicated page that shows live standings next to my prediction, so that I can instantly see how my picks are performing.

#### Acceptance Criteria

1. THE Tournament_Dashboard SHALL be accessible at the `/tournament` route within the existing Next.js App Router structure.
2. WHEN a user visits `/tournament`, THE Tournament_Dashboard SHALL display the Cached_Standings as a ranked list showing each player's current rank and name.
3. WHEN an authenticated user visits `/tournament`, THE Tournament_Dashboard SHALL display that user's most recent prediction for the active tournament alongside the live standings.
4. WHEN an unauthenticated user visits `/tournament`, THE Tournament_Dashboard SHALL display the live standings and a prompt to log in to see their prediction comparison.
5. WHILE the Tournament_Status is `active`, THE Tournament_Dashboard SHALL display a visual indicator (e.g., a "LIVE" badge) to communicate that standings are updating.
6. WHILE the Tournament_Status is `completed`, THE Tournament_Dashboard SHALL display a "Final" indicator and suppress the live update badge.
7. WHEN the Tournament_Dashboard renders a player row that matches the authenticated user's predicted rank for that player, THE Tournament_Dashboard SHALL visually distinguish that row to highlight a correct or near-correct prediction.

---

### Requirement 4: On-Demand Standings Refresh (Admin)

**User Story:** As an admin, I want to manually trigger a standings refresh, so that I can force an update outside of the scheduled polling interval.

#### Acceptance Criteria

1. THE system SHALL expose a `POST /api/admin/refresh-standings` endpoint that triggers the Tournament_Poller immediately.
2. WHEN a non-Admin user calls `POST /api/admin/refresh-standings`, THE system SHALL return HTTP 403 and SHALL NOT invoke the Tournament_Poller.
3. WHEN an Admin calls `POST /api/admin/refresh-standings` and the External_API returns successfully, THE system SHALL return HTTP 200 with the updated fetch timestamp.
4. IF the Tournament_Poller fails during an admin-triggered refresh, THEN THE system SHALL return HTTP 502 with a descriptive error message.

---

### Requirement 5: Automatic Score Computation on Tournament Completion

**User Story:** As a fan, I want my prediction score to be computed automatically when the tournament ends, so that I do not have to wait for a manual admin action.

#### Acceptance Criteria

1. WHEN the Tournament_Poller detects that the Tournament_Status has transitioned to `completed`, THE Tournament_Poller SHALL write the final Player_Entry array to the `tournament_results` table using the existing schema.
2. WHEN a new row is inserted into `tournament_results`, THE system SHALL invoke the Score_Engine (`POST /api/admin/compute-scores`) to compute and persist scores for all predictions associated with that tournament.
3. IF the Score_Engine invocation fails, THEN THE system SHALL log the failure with the tournament identifier and SHALL NOT mark the tournament as scored, allowing a retry on the next poll cycle.
4. THE system SHALL NOT invoke the Score_Engine more than once for the same tournament completion event.

---

### Requirement 6: Polling Schedule Configuration

**User Story:** As an admin, I want to control how frequently the app polls the chess API, so that I can balance data freshness against API rate limits.

#### Acceptance Criteria

1. THE Tournament_Poller SHALL support a configurable polling interval specified in minutes via an environment variable, with a default of 5 minutes.
2. WHILE the Tournament_Status is `upcoming`, THE Tournament_Poller SHALL poll at a reduced interval of no more than once every 60 minutes.
3. WHILE the Tournament_Status is `active`, THE Tournament_Poller SHALL poll at the configured interval (default 5 minutes).
4. WHILE the Tournament_Status is `completed`, THE Tournament_Poller SHALL cease polling for that tournament.
5. IF the configured polling interval is set to a value less than 1 minute, THEN THE Tournament_Poller SHALL reject the configuration, log an error, and default to 5 minutes.

---

### Requirement 7: Data Integrity and Round-Trip Fidelity

**User Story:** As a developer, I want the standings data to survive the fetch-transform-store-display cycle without corruption, so that users always see accurate rankings.

#### Acceptance Criteria

1. THE Tournament_Poller SHALL assign ranks as consecutive integers starting at 1, with no gaps and no duplicates, after transforming External_API data.
2. FOR ALL valid Live_Standings arrays fetched from the External_API, serializing the array to JSONB and deserializing it back SHALL produce an array equal to the original (round-trip property).
3. WHEN standings are read from the `live_standings` table and rendered on the Tournament_Dashboard, THE Tournament_Dashboard SHALL display players in ascending rank order (rank 1 first).
4. IF the External_API response contains a player with a missing or non-positive rank, THEN THE Tournament_Poller SHALL discard that player entry and log a warning with the player identifier.
