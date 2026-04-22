import { supabaseAdmin } from "@/lib/supabase-server";
import { transformApiResponse, TransformError } from "@/lib/apiTransformer";
import type { LiveStandings, PlayerEntry } from "@/lib/types";

export interface PollResult {
  status: "updated" | "skipped" | "error";
  fetchedAt?: string;
  errorMessage?: string;
}

function getPollIntervalMinutes(): number {
  const raw = process.env.POLL_INTERVAL_MINUTES;
  const parsed = raw !== undefined ? parseInt(raw, 10) : NaN;
  if (isNaN(parsed) || parsed < 1) {
    if (raw !== undefined) {
      console.error(
        `[poller] POLL_INTERVAL_MINUTES value "${raw}" is invalid or < 1; defaulting to 5 minutes`,
      );
    }
    return 5;
  }
  return parsed;
}

export interface PollOptions {
  force?: boolean;
}

export async function pollStandings(
  tournamentId: string,
  options: PollOptions = {},
): Promise<PollResult> {
  const { force = false } = options;

  // 1. Read current live_standings row
  const { data: row, error: readError } = (await supabaseAdmin
    .from("live_standings")
    .select("*")
    .eq("tournament_id", tournamentId)
    .maybeSingle()) as { data: LiveStandings | null; error: any };

  if (readError) {
    console.error(
      `[poller] Failed to read live_standings for ${tournamentId}:`,
      readError.message,
    );
    return { status: "error", errorMessage: readError.message };
  }

  const now = new Date();

  // 2. Adaptive interval logic (skipped when force=true)
  if (row && !force) {
    if (row.status === "completed") {
      return { status: "skipped" };
    }

    const lastFetch = new Date(row.fetched_at);
    const elapsedMinutes = (now.getTime() - lastFetch.getTime()) / 60_000;

    if (row.status === "upcoming" && elapsedMinutes < 60) {
      return { status: "skipped" };
    }

    const pollInterval = getPollIntervalMinutes();
    if (row.status === "active" && elapsedMinutes < pollInterval) {
      return { status: "skipped" };
    }
  }

  // 3. Fetch from External_API with 10-second timeout
  const apiSource = process.env.EXTERNAL_API_SOURCE as
    | "lichess"
    | "chessdotcom";
  const apiBaseUrl = process.env.EXTERNAL_API_BASE_URL;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let raw: unknown;
  try {
    const response = await fetch(`${apiBaseUrl}/${tournamentId}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(
        `[poller] External_API returned HTTP ${response.status} for tournament ${tournamentId}`,
      );
      return {
        status: "error",
        errorMessage: `HTTP ${response.status}`,
      };
    }

    raw = await response.json();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error(
        `[poller] External_API request timed out for tournament ${tournamentId}`,
      );
      return { status: "error", errorMessage: "Request timed out" };
    }
    console.error(
      `[poller] External_API fetch failed for tournament ${tournamentId}:`,
      err,
    );
    return { status: "error", errorMessage: String(err) };
  } finally {
    clearTimeout(timeoutId);
  }

  // 4. Transform response
  let standings: PlayerEntry[];
  try {
    standings = transformApiResponse(raw, apiSource);
  } catch (err) {
    if (err instanceof TransformError) {
      const excerpt = JSON.stringify(raw).slice(0, 200);
      console.error(
        `[poller] TransformError for tournament ${tournamentId}: ${err.message}. Payload excerpt: ${excerpt}`,
      );
    } else {
      console.error(
        `[poller] Unexpected transform error for tournament ${tournamentId}:`,
        err,
      );
    }
    return { status: "error", errorMessage: String(err) };
  }

  // 5. Determine new status from API response (preserve existing or default to active)
  const fetchedAt = now.toISOString();
  const previousStatus = row?.status ?? "upcoming";

  // Detect completed transition from the API response shape
  // The API response may include a "status" field; otherwise keep existing status
  let newStatus = previousStatus;
  if (
    raw !== null &&
    typeof raw === "object" &&
    "status" in (raw as Record<string, unknown>)
  ) {
    const apiStatus = (raw as Record<string, unknown>).status;
    if (
      apiStatus === "upcoming" ||
      apiStatus === "active" ||
      apiStatus === "completed"
    ) {
      newStatus = apiStatus as "upcoming" | "active" | "completed";
    }
  }

  // 6. Upsert live_standings
  const { error: upsertError } = await supabaseAdmin
    .from("live_standings")
    .upsert(
      {
        tournament_id: tournamentId,
        tournament_name: row?.tournament_name ?? tournamentId,
        standings,
        status: newStatus,
        fetched_at: fetchedAt,
      },
      { onConflict: "tournament_id" },
    );

  if (upsertError) {
    console.error(
      `[poller] Failed to upsert live_standings for ${tournamentId}:`,
      upsertError.message,
    );
    return { status: "error", errorMessage: upsertError.message };
  }

  // 7. Handle completed transition
  const isCompletedTransition =
    newStatus === "completed" && previousStatus !== "completed";

  if (isCompletedTransition) {
    // Check idempotency guard — re-read scored_at
    const { data: freshRow } = (await supabaseAdmin
      .from("live_standings")
      .select("scored_at")
      .eq("tournament_id", tournamentId)
      .maybeSingle()) as {
      data: Pick<LiveStandings, "scored_at"> | null;
      error: any;
    };

    if (freshRow?.scored_at) {
      // Already scored — skip Score_Engine
      return { status: "updated", fetchedAt };
    }

    // Insert into tournament_results
    const { error: insertError } = await supabaseAdmin
      .from("tournament_results")
      .insert({
        tournament_name: row?.tournament_name ?? tournamentId,
        final_standings: standings,
      });

    if (insertError) {
      console.error(
        `[poller] Failed to insert tournament_results for ${tournamentId}:`,
        insertError.message,
      );
      return { status: "updated", fetchedAt };
    }

    // POST to Score_Engine
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const cronSecret = process.env.CRON_SECRET;

    const scoreResponse = await fetch(`${appUrl}/api/admin/compute-scores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({
        tournamentName: row?.tournament_name ?? tournamentId,
      }),
    });

    if (!scoreResponse.ok) {
      console.error(
        `[poller] Score_Engine call failed for ${tournamentId}: HTTP ${scoreResponse.status}`,
      );
      return { status: "updated", fetchedAt };
    }

    // Set scored_at only on success
    const { error: scoredAtError } = await supabaseAdmin
      .from("live_standings")
      .update({ scored_at: new Date().toISOString() })
      .eq("tournament_id", tournamentId);

    if (scoredAtError) {
      console.error(
        `[poller] Failed to set scored_at for ${tournamentId}:`,
        scoredAtError.message,
      );
    }
  }

  return { status: "updated", fetchedAt };
}
