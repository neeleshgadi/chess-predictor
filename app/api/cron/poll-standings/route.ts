import { NextRequest, NextResponse } from "next/server";
import { pollStandings } from "@/lib/poller";

export async function GET(request: NextRequest) {
  // Validate Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read TOURNAMENT_ID from env
  const tournamentId = process.env.TOURNAMENT_ID;
  if (!tournamentId) {
    throw new Error(
      "[cron/poll-standings] TOURNAMENT_ID environment variable is not set",
    );
  }

  // Call pollStandings and return result
  try {
    const result = await pollStandings(tournamentId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[cron/poll-standings] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
