import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/adminAuth";
import type { PlayerEntry } from "@/lib/types";

// GET /api/admin/tournaments — list all tournaments ordered by fetched_at DESC
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("live_standings")
    .select("*")
    .order("fetched_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch tournaments" },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? [], { status: 200 });
}

// POST /api/admin/tournaments — create a new tournament
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    tournament_id?: unknown;
    tournament_name?: unknown;
    source?: unknown;
    start_date?: unknown;
    end_date?: unknown;
    standings?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
  }

  // Validate required fields
  const {
    tournament_id,
    tournament_name,
    source,
    start_date,
    end_date,
    standings,
  } = body;

  if (
    !tournament_id ||
    typeof tournament_id !== "string" ||
    !tournament_name ||
    typeof tournament_name !== "string" ||
    !source ||
    typeof source !== "string" ||
    !start_date ||
    typeof start_date !== "string" ||
    !end_date ||
    typeof end_date !== "string" ||
    !standings
  ) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: tournament_id, tournament_name, source, start_date, end_date, standings",
      },
      { status: 422 },
    );
  }

  // Validate source value
  if (source !== "lichess" && source !== "chessdotcom") {
    return NextResponse.json(
      { error: "source must be 'lichess' or 'chessdotcom'" },
      { status: 422 },
    );
  }

  // Validate date range
  if (end_date < start_date) {
    return NextResponse.json(
      { error: "end_date must be greater than or equal to start_date" },
      { status: 422 },
    );
  }

  // Validate standings array
  if (!Array.isArray(standings) || standings.length < 2) {
    return NextResponse.json(
      { error: "standings must contain at least 2 players" },
      { status: 422 },
    );
  }

  // Validate no duplicate player IDs
  const playerIds = (standings as PlayerEntry[]).map((p) => p.id);
  const uniqueIds = new Set(playerIds);
  if (uniqueIds.size !== playerIds.length) {
    return NextResponse.json(
      { error: "standings contains duplicate player IDs" },
      { status: 422 },
    );
  }

  // Check for existing tournament_id
  const { data: existing } = await supabaseAdmin
    .from("live_standings")
    .select("id")
    .eq("tournament_id", tournament_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Tournament ID already exists" },
      { status: 409 },
    );
  }

  // Assign sequential ranks (rank = index + 1)
  const rankedStandings: PlayerEntry[] = (standings as PlayerEntry[]).map(
    (player, index) => ({ ...player, rank: index + 1 }),
  );

  // Insert the new tournament row
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("live_standings")
    .insert({
      tournament_id,
      tournament_name,
      source,
      start_date,
      end_date,
      standings: rankedStandings,
      status: "upcoming",
      fetched_at: new Date().toISOString(),
    })
    .select("tournament_id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "Failed to create tournament" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { tournament_id: inserted.tournament_id },
    { status: 201 },
  );
}
