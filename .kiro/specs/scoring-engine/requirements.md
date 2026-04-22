# Requirements Document

## Introduction

The Scoring Engine automates the evaluation of user predictions against official tournament results for the Chess Predictor platform. After a tournament concludes, an admin publishes the official final standings. The Scoring Engine then compares each user's `ranked_list` (stored in Supabase) against those official results, computes a numeric score, and persists it so the leaderboard can rank users meaningfully. Users see their "Points Earned" on their profile and on the community leaderboard.

## Glossary

- **Scoring_Engine**: The server-side module responsible for computing and persisting prediction scores.
- **Prediction**: A row in the `predictions` table containing a `user_name`, a `ranked_list` (ordered array of players), and an optional `score`.
- **Ranked_List**: The ordered JSON array of players a user submitted as their predicted final standings, stored in `predictions.ranked_list`.
- **Official_Result**: The authoritative final standings for a tournament, stored in the `tournament_results` table as an ordered array of players.
- **Tournament**: A chess competition (e.g., FIDE Candidates, Tata Steel) for which users submit predictions.
- **Score**: A non-negative integer representing the total points a user earned for a given prediction.
- **Exact_Match_Points**: Points awarded when a user predicts a player's position exactly correctly.
- **Off_By_One_Points**: Points awarded when a user predicts a player's position one place off from the official result.
- **Leaderboard**: The ranked list of all users ordered by their Score, displayed at `/leaderboard`.
- **Admin**: An authenticated user with the `admin` role who is authorized to publish official results and trigger scoring.

---

## Requirements

### Requirement 1: Scoring Formula

**User Story:** As a platform designer, I want a well-defined scoring formula, so that users understand how points are calculated and the system can compute scores deterministically.

#### Acceptance Criteria

1. THE Scoring_Engine SHALL award 3 points for each player a user placed in the exact correct position (Exact_Match_Points).
2. THE Scoring_Engine SHALL award 1 point for each player a user placed exactly one position away from the correct position (Off_By_One_Points).
3. THE Scoring_Engine SHALL award 0 points for any player placed two or more positions away from the correct position.
4. THE Scoring_Engine SHALL compute a Score as the sum of all Exact_Match_Points and Off_By_One_Points across all players in the Ranked_List.
5. WHEN two players are compared for position offset, THE Scoring_Engine SHALL use the 1-based rank index from the Official_Result as the reference position.
6. THE Scoring_Engine SHALL produce a Score that is a non-negative integer for every valid Prediction.

---

### Requirement 2: Official Results Storage

**User Story:** As an admin, I want to store official tournament results in the database, so that the Scoring Engine has an authoritative source to compare predictions against.

#### Acceptance Criteria

1. THE Database SHALL contain a `tournament_results` table with columns: `id`, `tournament_name`, `final_standings` (ordered JSONB array of players), and `created_at`.
2. WHEN an admin inserts a row into `tournament_results`, THE Database SHALL enforce that `tournament_name` is a non-empty text value.
3. WHEN an admin inserts a row into `tournament_results`, THE Database SHALL enforce that `final_standings` is a non-empty JSONB array.
4. THE Database SHALL enforce that only users with the `admin` role may insert or update rows in `tournament_results`.
5. THE Database SHALL allow public read access to `tournament_results` so scores can be displayed to all users.

---

### Requirement 3: Score Computation Trigger

**User Story:** As an admin, I want to trigger score computation after publishing official results, so that all existing predictions are scored automatically without manual intervention.

#### Acceptance Criteria

1. WHEN an admin triggers score computation for a Tournament, THE Scoring_Engine SHALL retrieve all Predictions associated with that Tournament from the `predictions` table.
2. WHEN an admin triggers score computation for a Tournament, THE Scoring_Engine SHALL retrieve the Official_Result for that Tournament from the `tournament_results` table.
3. WHEN score computation is triggered, THE Scoring_Engine SHALL compute a Score for every retrieved Prediction using the formula defined in Requirement 1.
4. WHEN score computation is triggered, THE Scoring_Engine SHALL persist each computed Score to the corresponding row in the `predictions` table.
5. IF the `tournament_results` table contains no row for the specified Tournament, THEN THE Scoring_Engine SHALL return a descriptive error and SHALL NOT modify any Prediction rows.
6. IF a Prediction's `ranked_list` contains players not present in the Official_Result, THEN THE Scoring_Engine SHALL assign 0 points for those players and continue scoring the remaining players.

---

### Requirement 4: Score Persistence

**User Story:** As a developer, I want computed scores stored directly on prediction rows, so that the leaderboard query remains simple and performant.

#### Acceptance Criteria

1. THE Database SHALL add a `score` column of type integer with a default value of `null` to the `predictions` table.
2. WHEN the Scoring_Engine persists a computed Score, THE Database SHALL update the `score` column on the corresponding Prediction row.
3. WHILE a Tournament's official results have not yet been published, THE Database SHALL retain `score` as `null` for all associated Predictions.
4. THE Database SHALL allow the `score` column to be updated only by the service role (server-side), not by public clients.

---

### Requirement 5: Leaderboard Score Display

**User Story:** As a user, I want to see each predictor's score on the leaderboard, so that I can compare my performance against others.

#### Acceptance Criteria

1. WHEN the Leaderboard page loads, THE Leaderboard SHALL display the Score for each Prediction alongside the user's name and ranked list.
2. WHEN a Prediction has a `null` score, THE Leaderboard SHALL display a "Pending" indicator in place of a numeric score.
3. WHEN the Leaderboard page loads, THE Leaderboard SHALL order Predictions by Score descending, with `null`-score Predictions appearing after all scored Predictions.
4. WHEN two Predictions have equal Scores, THE Leaderboard SHALL order those Predictions by `created_at` ascending (earlier submission ranks higher).

---

### Requirement 6: User Profile Score Display

**User Story:** As a user, I want to see my own "Points Earned" on my profile, so that I know how well my prediction performed.

#### Acceptance Criteria

1. WHEN a logged-in user views their profile, THE Profile_Page SHALL display the Score for each of the user's Predictions.
2. WHEN a Prediction has a `null` score, THE Profile_Page SHALL display "Awaiting Results" in place of a numeric score.
3. THE Profile_Page SHALL display the tournament name associated with each Prediction alongside its Score.

---

### Requirement 7: Scoring Correctness Properties

**User Story:** As a developer, I want the scoring formula to be verifiable through automated tests, so that I can be confident scores are computed correctly for any input.

#### Acceptance Criteria

1. FOR ALL valid Ranked_Lists of length N, THE Scoring_Engine SHALL produce a Score in the range [0, 3N].
2. FOR ALL valid Ranked_Lists, THE Scoring_Engine SHALL produce the same Score when the computation is run multiple times with the same inputs (idempotence).
3. WHEN a Ranked_List is identical to the Official_Result, THE Scoring_Engine SHALL produce a Score equal to 3 × N, where N is the number of players.
4. WHEN a Ranked_List has every player shifted by exactly two or more positions from the Official_Result, THE Scoring_Engine SHALL produce a Score of 0.
5. FOR ALL valid Ranked_Lists, THE Scoring_Engine SHALL produce a Score that is a non-negative integer.
