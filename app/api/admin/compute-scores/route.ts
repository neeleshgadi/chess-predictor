import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { computeScore } from "@/lib/scoring";
import { evaluateAndAwardBadges } from "@/lib/badgeEngine";
import type { BadgeAwardContext } from "@/lib/badgeEngine";
import type { Prediction, TournamentResult } from "@/lib/types";
import { requireAdmin } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  // 1. Parse request body
  let tournamentName: string;
  try {
    const body = await request.json();
    tournamentName = body?.tournamentName;
    if (!tournamentName || typeof tournamentName !== "string") {
      return NextResponse.json(
        { error: "tournamentName is required" },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 2. Verify admin role
  const auth = await requireAdmin();
  if (!auth.ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 3. Fetch tournament_results row
  const { data: tournamentResult, error: tournamentError } =
    (await supabaseAdmin
      .from("tournament_results")
      .select("*")
      .eq("tournament_name", tournamentName)
      .single()) as { data: TournamentResult | null; error: any };

  if (tournamentError || !tournamentResult) {
    return NextResponse.json(
      { error: `Tournament result not found for: ${tournamentName}` },
      { status: 404 },
    );
  }

  const officialStandings = tournamentResult.final_standings;

  // 4. Fetch all predictions
  const { data: predictions, error: predictionsError } = await supabaseAdmin
    .from("predictions")
    .select("*");

  if (predictionsError) {
    return NextResponse.json(
      { error: "Failed to fetch predictions" },
      { status: 500 },
    );
  }

  const rows = (predictions ?? []) as Prediction[];

  // 5 & 6. Compute scores and batch-update
  const updates = rows.map((prediction) => ({
    id: prediction.id,
    score: computeScore(prediction.ranked_list, officialStandings),
  }));

  if (updates.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from("predictions")
      .upsert(updates, { onConflict: "id" });

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update scores" },
        { status: 500 },
      );
    }
  }

  // 7. Evaluate and award badges (best-effort — failures do not roll back scores)
  let badgesAwarded = 0;
  let badgesFailed = 0;

  // 7a. Fetch the tournament's live_standings row to get tournamentId
  const { data: liveStandingsRow } = await supabaseAdmin
    .from("live_standings")
    .select("tournament_id, tournament_name")
    .eq("tournament_name", tournamentName)
    .maybeSingle();

  const tournamentId = liveStandingsRow?.tournament_id ?? tournamentName;

  // 7b. Fetch updated predictions for this tournament to build the leaderboard
  const { data: tournamentPredictions } = await supabaseAdmin
    .from("predictions")
    .select("*")
    .eq("tournament_name", tournamentName);

  const tournamentRows = (tournamentPredictions ?? []) as Prediction[];

  // Build leaderboard: all users' scores for this tournament
  const tournamentLeaderboard = tournamentRows
    .filter((p) => p.score !== null)
    .map((p) => ({ userName: p.user_name, score: p.score as number }))
    .sort((a, b) => b.score - a.score);

  // 7c. Fetch all scored predictions across all tournaments (for seasoned analyst check)
  const { data: allScoredPredictions } = await supabaseAdmin
    .from("predictions")
    .select("*")
    .not("score", "is", null);

  const allScored = (allScoredPredictions ?? []) as Prediction[];

  // 7d. Look up auth user IDs by user_name (email prefix)
  // user_name is derived from email as email.split("@")[0]
  const uniqueUserNames = [...new Set(tournamentRows.map((p) => p.user_name))];

  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  const userIdByName: Record<string, string> = {};
  for (const user of authUsers?.users ?? []) {
    const name = user.email?.split("@")[0];
    if (name && uniqueUserNames.includes(name)) {
      userIdByName[name] = user.id;
    }
  }

  // 7e. Evaluate badges per user
  for (const userName of uniqueUserNames) {
    const userId = userIdByName[userName];
    if (!userId) {
      // Cannot award badges without a valid user_id — skip
      badgesFailed++;
      continue;
    }

    const userPrediction = tournamentRows.find((p) => p.user_name === userName);
    if (!userPrediction) continue;

    const userAllPredictions = allScored.filter(
      (p) => p.user_name === userName,
    );

    const ctx: BadgeAwardContext = {
      userId,
      userName,
      tournamentId,
      tournamentName,
      prediction: userPrediction,
      officialStandings,
      allUserPredictions: userAllPredictions,
      tournamentLeaderboard,
    };

    try {
      await evaluateAndAwardBadges(ctx, supabaseAdmin);
      badgesAwarded++;
    } catch {
      badgesFailed++;
    }
  }

  // 8. Return success with badge counts
  return NextResponse.json({
    updated: updates.length,
    badgesAwarded,
    badgesFailed,
  });
}
