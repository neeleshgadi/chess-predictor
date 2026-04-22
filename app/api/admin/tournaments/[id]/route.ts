import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/adminAuth";
import type { PlayerEntry } from "@/lib/types";

function assignRanks(roster: PlayerEntry[]): PlayerEntry[] {
  return roster.map((p, i) => ({ ...p, rank: i + 1 }));
}

// PATCH /api/admin/tournaments/[id] — update an upcoming tournament
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("live_standings")
    .select("*")
    .eq("tournament_id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 },
    );
  }

  if (existing.status !== "upcoming") {
    return NextResponse.json(
      { error: "Only upcoming tournaments can be edited" },
      { status: 409 },
    );
  }

  let body: {
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

  const { tournament_name, source, start_date, end_date, standings } = body;

  // Validate date range using provided values or falling back to existing
  const effectiveStartDate =
    typeof start_date === "string" ? start_date : existing.start_date;
  const effectiveEndDate =
    typeof end_date === "string" ? end_date : existing.end_date;

  if (
    effectiveStartDate &&
    effectiveEndDate &&
    effectiveEndDate < effectiveStartDate
  ) {
    return NextResponse.json(
      { error: "end_date must be greater than or equal to start_date" },
      { status: 422 },
    );
  }

  // Build the update payload with only provided fields
  const updates: Record<string, unknown> = {};

  if (typeof tournament_name === "string")
    updates.tournament_name = tournament_name;
  if (typeof source === "string") updates.source = source;
  if (typeof start_date === "string") updates.start_date = start_date;
  if (typeof end_date === "string") updates.end_date = end_date;

  if (standings !== undefined) {
    if (!Array.isArray(standings)) {
      return NextResponse.json(
        { error: "standings must be an array" },
        { status: 422 },
      );
    }
    updates.standings = assignRanks(standings as PlayerEntry[]);
  }

  const { error: updateError } = await supabaseAdmin
    .from("live_standings")
    .update(updates)
    .eq("tournament_id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update tournament" },
      { status: 500 },
    );
  }

  return NextResponse.json({ tournament_id: id }, { status: 200 });
}

// DELETE /api/admin/tournaments/[id] — delete an upcoming tournament
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("live_standings")
    .select("tournament_id, status")
    .eq("tournament_id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 },
    );
  }

  if (existing.status !== "upcoming") {
    return NextResponse.json(
      { error: "Only upcoming tournaments can be deleted" },
      { status: 409 },
    );
  }

  const { error: deleteError } = await supabaseAdmin
    .from("live_standings")
    .delete()
    .eq("tournament_id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete tournament" },
      { status: 500 },
    );
  }

  return NextResponse.json({}, { status: 200 });
}
