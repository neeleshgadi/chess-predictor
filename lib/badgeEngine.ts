import { SupabaseClient } from "@supabase/supabase-js";
import { BadgeType, PlayerEntry, Prediction } from "./types";
import { computeScore } from "./scoring";

export type { BadgeType };

export interface BadgeAwardContext {
  userId: string;
  userName: string;
  tournamentId: string;
  tournamentName: string;
  prediction: Prediction;
  officialStandings: PlayerEntry[];
  /** All scored predictions for this user across all tournaments */
  allUserPredictions: Prediction[];
  /** All users' scores for this tournament, used for podium check */
  tournamentLeaderboard: { userName: string; score: number }[];
}

// ---------------------------------------------------------------------------
// Pure condition checkers
// ---------------------------------------------------------------------------

/**
 * Returns true iff at least one player in the prediction occupies the same
 * rank position in the official standings.
 */
export function checkSharpEye(
  prediction: Prediction,
  officialStandings: PlayerEntry[],
): boolean {
  const officialRankById: Record<string, number> = {};
  for (const entry of officialStandings) {
    officialRankById[entry.id] = entry.rank;
  }
  return prediction.ranked_list.some(
    (entry) => officialRankById[entry.id] === entry.rank,
  );
}

/**
 * Returns true iff the prediction's score equals the maximum possible score
 * (3 × number of players in official standings).
 */
export function checkPerfectCall(
  prediction: Prediction,
  officialStandings: PlayerEntry[],
): boolean {
  const maxScore = 3 * officialStandings.length;
  const actual = computeScore(prediction.ranked_list, officialStandings);
  return actual === maxScore;
}

/**
 * Returns true iff the user has scored predictions in 3 or more distinct
 * tournaments.
 */
export function checkSeasonedAnalyst(
  allUserPredictions: Prediction[],
): boolean {
  const distinctTournaments = new Set(
    allUserPredictions
      .filter((p) => p.score !== null)
      .map((p) => p.tournament_name)
      .filter(Boolean),
  );
  return distinctTournaments.size >= 3;
}

/**
 * Returns true iff the user's rank in the tournament leaderboard (sorted by
 * score descending) is ≤ 3.
 */
export function checkPodiumFinish(
  userName: string,
  tournamentLeaderboard: { userName: string; score: number }[],
): boolean {
  const sorted = [...tournamentLeaderboard].sort((a, b) => b.score - a.score);
  const rank = sorted.findIndex((entry) => entry.userName === userName);
  return rank !== -1 && rank + 1 <= 3;
}

// ---------------------------------------------------------------------------
// Badge award orchestrator
// ---------------------------------------------------------------------------

/**
 * Evaluates all badge conditions for the given context and upserts any earned
 * badges into the `user_badges` table.
 *
 * - Uses the unique constraint (user_id, badge_type, tournament_id) to make
 *   repeated calls idempotent — duplicate-key errors are treated as no-ops.
 * - Unexpected Supabase errors are logged but never thrown; badge failures
 *   must not roll back score updates.
 */
export async function evaluateAndAwardBadges(
  ctx: BadgeAwardContext,
  supabaseAdmin: SupabaseClient,
): Promise<void> {
  const candidates: { badge_type: BadgeType; tournament_id: string | null }[] =
    [];

  if (checkSharpEye(ctx.prediction, ctx.officialStandings)) {
    candidates.push({
      badge_type: "sharp_eye",
      tournament_id: ctx.tournamentId,
    });
  }

  if (checkPerfectCall(ctx.prediction, ctx.officialStandings)) {
    candidates.push({
      badge_type: "perfect_call",
      tournament_id: ctx.tournamentId,
    });
  }

  if (checkSeasonedAnalyst(ctx.allUserPredictions)) {
    // Seasoned Analyst is not tied to a specific tournament
    candidates.push({ badge_type: "seasoned_analyst", tournament_id: null });
  }

  if (checkPodiumFinish(ctx.userName, ctx.tournamentLeaderboard)) {
    candidates.push({
      badge_type: "podium_finish",
      tournament_id: ctx.tournamentId,
    });
  }

  for (const candidate of candidates) {
    const { error } = await supabaseAdmin.from("user_badges").upsert(
      {
        user_id: ctx.userId,
        badge_type: candidate.badge_type,
        tournament_id: candidate.tournament_id,
      },
      {
        onConflict: "user_id,badge_type,tournament_id",
        ignoreDuplicates: true,
      },
    );

    if (error) {
      // Unique-constraint violations (code 23505) are expected no-ops
      if (error.code === "23505") continue;
      console.error(
        `[badgeEngine] Failed to award badge "${candidate.badge_type}" ` +
          `for user ${ctx.userId}: ${error.message}`,
      );
    }
  }
}
