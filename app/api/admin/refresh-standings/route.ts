import { NextRequest, NextResponse } from "next/server";
import { pollStandings } from "@/lib/poller";
import { requireAdmin } from "@/lib/adminAuth";

export async function POST(_request: NextRequest) {
  // 1. Verify admin role
  const auth = await requireAdmin();
  if (!auth.ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Read tournament ID from env
  const tournamentId = process.env.TOURNAMENT_ID;
  if (!tournamentId) {
    return NextResponse.json(
      { error: "TOURNAMENT_ID environment variable is not set" },
      { status: 500 },
    );
  }

  // 3. Call pollStandings with force=true to bypass interval check
  const result = await pollStandings(tournamentId, { force: true });

  if (result.status === "error") {
    return NextResponse.json(
      { error: result.errorMessage ?? "Poller encountered an error" },
      { status: 502 },
    );
  }

  return NextResponse.json({ fetchedAt: result.fetchedAt });
}
