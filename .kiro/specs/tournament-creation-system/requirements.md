# Requirements Document

## Introduction

The Tournament Creation System is an admin dashboard feature for the Chess Predictor app that allows administrators to create and manage chess tournaments without writing or deploying code. An admin can define a tournament's name, player roster, external API source, start date, and end date through a web UI. The system provisions the necessary database records, wires up the live polling integration, and exposes controls to manually refresh standings or trigger score computation — all within 30 seconds of starting the workflow.

## Glossary

- **Admin_Dashboard**: The protected web UI at `/admin` accessible only to authenticated users with the `admin` JWT role claim.
- **Tournament**: A chess competition tracked by the app, represented by a row in `live_standings` and optionally `tournament_results`.
- **Tournament_Form**: The UI form within the Admin_Dashboard used to create or edit a Tournament.
- **Player**: A chess competitor identified by a unique ID and display name, represented as a `PlayerEntry` object (`{ rank, id, name }`).
- **Player_Roster**: The ordered list of Players participating in a Tournament.
- **External_API**: The third-party chess data source (Lichess or Chess.com) used to poll live standings.
- **Poller**: The existing `lib/poller.ts` service that fetches standings from the External_API and upserts `live_standings`.
- **Score_Engine**: The existing `POST /api/admin/compute-scores` route that computes prediction scores.
- **Admin_API**: The set of Next.js API routes under `/api/admin/` that perform privileged operations.
- **Supabase**: The PostgreSQL-backed backend-as-a-service used for data persistence and authentication.
- **Tournament_Status**: One of three lifecycle states: `upcoming`, `active`, or `completed`.

---

## Requirements

### Requirement 1: Admin Dashboard Access Control

**User Story:** As an admin, I want the dashboard to be protected so that only authorised users can create or manage tournaments.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to `/admin`, THE Admin_Dashboard SHALL redirect the user to `/login`.
2. WHEN an authenticated user without the `admin` JWT role claim navigates to `/admin`, THE Admin_Dashboard SHALL return a 403 Forbidden response.
3. WHEN an authenticated user with the `admin` JWT role claim navigates to `/admin`, THE Admin_Dashboard SHALL render the tournament management interface.
4. THE Admin_API SHALL verify the `admin` JWT role claim on every request and return HTTP 403 when the claim is absent or invalid.

---

### Requirement 2: Tournament Creation

**User Story:** As an admin, I want to create a new tournament by filling in a form, so that the app starts tracking it without any code changes.

#### Acceptance Criteria

1. THE Tournament_Form SHALL accept the following fields: tournament name (text), External_API source (`lichess` or `chessdotcom`), External_API tournament ID (text), start date (date), end date (date), and an initial Player_Roster.
2. WHEN the admin submits the Tournament_Form with all required fields valid, THE Admin_Dashboard SHALL call the Admin_API to create the Tournament.
3. WHEN the Admin_API receives a valid creation request, THE Admin_API SHALL insert a row into `live_standings` with `status` set to `upcoming`, `standings` set to the provided Player_Roster ranked in submission order, and `fetched_at` set to the current UTC timestamp.
4. WHEN the Admin_API receives a creation request where the `tournament_id` already exists in `live_standings`, THE Admin_API SHALL return HTTP 409 Conflict and SHALL NOT insert a duplicate row.
5. WHEN the Admin_API receives a creation request where `end_date` is earlier than `start_date`, THE Admin_API SHALL return HTTP 422 Unprocessable Entity with a descriptive error message.
6. WHEN the Admin_API receives a creation request where the Player_Roster contains fewer than 2 players, THE Admin_API SHALL return HTTP 422 Unprocessable Entity.
7. WHEN the Admin_API successfully creates a Tournament, THE Admin_API SHALL return HTTP 201 with the created `tournament_id`.
8. WHEN the Tournament_Form submission succeeds, THE Admin_Dashboard SHALL display a success confirmation and reset the form.
9. IF the Admin_API returns an error, THEN THE Admin_Dashboard SHALL display the error message without navigating away from the form.

---

### Requirement 3: Player Roster Management

**User Story:** As an admin, I want to build the player list interactively, so that I can add, reorder, and remove players before creating the tournament.

#### Acceptance Criteria

1. THE Tournament_Form SHALL provide an interface to add a Player by entering a player ID and display name.
2. WHEN the admin adds a Player, THE Tournament_Form SHALL assign a rank equal to the current roster size plus one and append the Player to the Player_Roster display.
3. WHEN the admin removes a Player from the Player_Roster, THE Tournament_Form SHALL re-rank the remaining Players sequentially starting from 1.
4. WHEN the admin reorders Players in the Player_Roster, THE Tournament_Form SHALL update all affected rank values to reflect the new order.
5. IF the admin attempts to add a Player whose ID already exists in the current Player_Roster, THEN THE Tournament_Form SHALL display a validation error and SHALL NOT add the duplicate.
6. THE Tournament_Form SHALL display each Player's current rank, ID, and display name in the roster list.

---

### Requirement 4: Tournament Listing and Status Display

**User Story:** As an admin, I want to see all tournaments and their current status, so that I can monitor and manage them from one place.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a list of all Tournaments retrieved from `live_standings`, ordered by `fetched_at` descending.
2. THE Admin_Dashboard SHALL display each Tournament's name, `tournament_id`, Tournament_Status, and `fetched_at` timestamp.
3. WHEN a Tournament has `status` equal to `active`, THE Admin_Dashboard SHALL display a visual indicator distinguishing it from `upcoming` and `completed` tournaments.
4. THE Admin_Dashboard SHALL refresh the tournament list after a successful create, edit, or delete operation without requiring a full page reload.

---

### Requirement 5: Manual Standings Refresh

**User Story:** As an admin, I want to trigger a standings refresh on demand, so that I can update live data outside the cron schedule.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a "Refresh Standings" action for each Tournament with `status` not equal to `completed`.
2. WHEN the admin triggers "Refresh Standings" for a Tournament, THE Admin_Dashboard SHALL call `POST /api/admin/refresh-standings` with the `tournament_id`.
3. WHEN `POST /api/admin/refresh-standings` is called, THE Admin_API SHALL invoke the Poller with `force: true` for the given `tournament_id`.
4. WHEN the Poller returns `status: "updated"`, THE Admin_API SHALL return HTTP 200 with the updated `fetched_at` timestamp.
5. IF the Poller returns `status: "error"`, THEN THE Admin_API SHALL return HTTP 502 with the Poller's `errorMessage`.
6. WHEN the refresh completes successfully, THE Admin_Dashboard SHALL update the displayed `fetched_at` timestamp for that Tournament without a full page reload.

---

### Requirement 6: Manual Score Computation Trigger

**User Story:** As an admin, I want to manually trigger score computation for a completed tournament, so that I can recompute scores if needed.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a "Compute Scores" action for each Tournament with `status` equal to `completed`.
2. WHEN the admin triggers "Compute Scores" for a Tournament, THE Admin_Dashboard SHALL call `POST /api/admin/compute-scores` with the `tournamentName`.
3. WHEN `POST /api/admin/compute-scores` returns HTTP 200, THE Admin_Dashboard SHALL display the returned `{ updated, badgesAwarded, badgesFailed }` counts as a confirmation message.
4. IF `POST /api/admin/compute-scores` returns an error, THEN THE Admin_Dashboard SHALL display the error message.

---

### Requirement 7: Tournament Editing

**User Story:** As an admin, I want to edit a tournament's name, dates, and player roster before it goes active, so that I can correct mistakes without deleting and recreating it.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide an edit action for each Tournament with `status` equal to `upcoming`.
2. WHEN the admin opens the edit action, THE Admin_Dashboard SHALL pre-populate the Tournament_Form with the Tournament's existing values.
3. WHEN the admin submits the edited Tournament_Form with valid data, THE Admin_API SHALL update the corresponding `live_standings` row with the new `tournament_name`, `standings`, and metadata.
4. WHEN the Admin_API receives an edit request for a Tournament with `status` not equal to `upcoming`, THE Admin_API SHALL return HTTP 409 Conflict and SHALL NOT apply the update.
5. IF the Admin_API returns an error during edit, THEN THE Admin_Dashboard SHALL display the error message without navigating away from the form.

---

### Requirement 8: Tournament Deletion

**User Story:** As an admin, I want to delete a tournament that was created by mistake, so that it does not appear to users.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL provide a delete action for each Tournament with `status` equal to `upcoming`.
2. WHEN the admin triggers the delete action, THE Admin_Dashboard SHALL display a confirmation prompt before proceeding.
3. WHEN the admin confirms deletion, THE Admin_API SHALL delete the `live_standings` row for that `tournament_id`.
4. WHEN the Admin_API receives a delete request for a Tournament with `status` not equal to `upcoming`, THE Admin_API SHALL return HTTP 409 Conflict and SHALL NOT delete the row.
5. WHEN the deletion succeeds, THE Admin_Dashboard SHALL remove the Tournament from the list without a full page reload.

---

### Requirement 9: Form Validation and Error Feedback

**User Story:** As an admin, I want clear validation feedback on the form, so that I can fix mistakes before submitting.

#### Acceptance Criteria

1. THE Tournament_Form SHALL validate all required fields (tournament name, External_API source, External_API tournament ID, start date, end date) before submission and display field-level error messages for any missing or invalid values.
2. WHEN the admin enters an end date earlier than the start date, THE Tournament_Form SHALL display an inline error on the end date field before submission.
3. WHEN the admin attempts to submit the Tournament_Form with zero players in the Player_Roster, THE Tournament_Form SHALL display a validation error and SHALL NOT submit the form.
4. THE Tournament_Form SHALL disable the submit button while a submission is in progress to prevent duplicate submissions.
