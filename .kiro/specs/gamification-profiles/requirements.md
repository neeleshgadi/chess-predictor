# Requirements Document

## Introduction

The Gamification & Profiles feature extends the Chess Predictor platform to increase user retention and engagement. It introduces a persistent user profile with cumulative scoring across tournaments, a tournament history view, and an achievement badge system that rewards accurate predictions. The goal is to give users a reason to return for every new tournament and to feel a sense of progression over time.

## Glossary

- **Profile_Page**: The authenticated `/profile` route that displays a user's prediction history and stats.
- **Tournament_History**: The chronological list of all tournaments a user has submitted predictions for, along with scores.
- **Cumulative_Score**: The sum of all scored prediction points earned by a user across all tournaments.
- **Badge**: A visual achievement awarded to a user when a defined milestone or prediction accuracy threshold is met.
- **Badge_Engine**: The server-side service responsible for evaluating badge award conditions and persisting earned badges.
- **Prediction**: A user-submitted ranked list of chess players for a specific tournament, stored in the `predictions` table.
- **Scoring_Engine**: The existing service that computes per-prediction scores (3 pts exact, 1 pt off-by-one).
- **Leaderboard**: The `/leaderboard` page showing all users ranked by score for the current tournament.
- **User**: An authenticated account identified by email via Supabase Auth.

---

## Requirements

### Requirement 1: Tournament History on Profile

**User Story:** As a chess fan, I want to see all my past tournament predictions and their scores on my profile, so that I can track my prediction history over time.

#### Acceptance Criteria

1. WHEN an authenticated User visits the Profile_Page, THE Profile_Page SHALL display a list of all Predictions submitted by that User, ordered by `created_at` descending.
2. WHEN a Prediction has a non-null score, THE Profile_Page SHALL display the numeric score for that Prediction alongside the tournament name and submission date.
3. WHEN a Prediction has a null score, THE Profile_Page SHALL display an "Awaiting Results" indicator for that Prediction.
4. WHEN a User has submitted zero Predictions, THE Profile_Page SHALL display an empty-state message prompting the User to make their first prediction.
5. THE Profile_Page SHALL display the tournament name associated with each Prediction by joining against the `live_standings` or `tournament_results` tables.

---

### Requirement 2: Cumulative Score Display

**User Story:** As a chess fan, I want to see my total points earned across all tournaments, so that I can understand my overall prediction performance.

#### Acceptance Criteria

1. THE Profile_Page SHALL display the User's Cumulative_Score, computed as the sum of all non-null `score` values across all of that User's Predictions.
2. WHEN a User has no scored Predictions, THE Profile_Page SHALL display a Cumulative_Score of 0.
3. WHEN a new Prediction score is persisted by the Scoring_Engine, THE Profile_Page SHALL reflect the updated Cumulative_Score on the next page load.
4. THE Profile_Page SHALL display the number of tournaments the User has participated in alongside the Cumulative_Score.

---

### Requirement 3: Badge System — Award Conditions

**User Story:** As a chess fan, I want to earn badges for prediction milestones, so that I feel rewarded for accuracy and participation.

#### Acceptance Criteria

1. WHEN the Scoring_Engine finalises scores for a tournament, THE Badge_Engine SHALL evaluate all badge award conditions for every User who submitted a Prediction for that tournament.
2. WHEN a User's Prediction contains at least one player ranked in the exact correct position, THE Badge_Engine SHALL award the User the "Sharp Eye" badge for that tournament, if not already awarded.
3. WHEN a User's Prediction score equals the maximum possible score for that tournament's player list, THE Badge_Engine SHALL award the User the "Perfect Call" badge for that tournament, if not already awarded.
4. WHEN a User has submitted scored Predictions for 3 or more distinct tournaments, THE Badge_Engine SHALL award the User the "Seasoned Analyst" badge, if not already awarded.
5. WHEN a User's Prediction score places them in the top 3 positions on the Leaderboard for a completed tournament, THE Badge_Engine SHALL award the User the "Podium Finish" badge for that tournament, if not already awarded.
6. IF a badge award condition is evaluated and the badge has already been awarded to the User, THEN THE Badge_Engine SHALL skip the award without creating a duplicate record.

---

### Requirement 4: Badge Display on Profile

**User Story:** As a chess fan, I want to see my earned badges on my profile, so that I can showcase my prediction achievements.

#### Acceptance Criteria

1. THE Profile_Page SHALL display all Badges earned by the authenticated User.
2. WHEN a User has earned zero Badges, THE Profile_Page SHALL display a message indicating no badges have been earned yet.
3. THE Profile_Page SHALL display each Badge with its name and a brief description of the award condition.
4. WHEN a Badge is associated with a specific tournament, THE Profile_Page SHALL display the tournament name alongside that Badge.

---

### Requirement 5: Badge Persistence

**User Story:** As a developer, I want badge awards to be stored in the database, so that they persist across sessions and can be queried efficiently.

#### Acceptance Criteria

1. THE Badge_Engine SHALL persist each awarded Badge as a record in a `user_badges` table containing the user identifier, badge type, tournament identifier (nullable), and awarded timestamp.
2. WHEN a badge award is persisted, THE Badge_Engine SHALL record the `awarded_at` timestamp in UTC.
3. THE `user_badges` table SHALL enforce a unique constraint on (user identifier, badge type, tournament identifier) to prevent duplicate awards.
4. THE `user_badges` table SHALL enable Row Level Security such that a User can only read their own badge records.

---

### Requirement 6: Leaderboard Cumulative Rankings

**User Story:** As a chess fan, I want to see an all-time leaderboard ranked by cumulative points, so that I can compare my overall performance against other fans.

#### Acceptance Criteria

1. THE Leaderboard SHALL provide a view that ranks all Users by their Cumulative_Score in descending order.
2. WHEN two Users share the same Cumulative_Score, THE Leaderboard SHALL order them by the number of tournaments participated in, descending.
3. WHEN a User has no scored Predictions, THE Leaderboard SHALL display that User's Cumulative_Score as 0.
4. THE Leaderboard SHALL display each User's total number of tournaments participated in alongside their Cumulative_Score.
5. WHEN the Leaderboard page is loaded, THE Leaderboard SHALL display both the per-tournament view and the all-time cumulative view as selectable tabs.
