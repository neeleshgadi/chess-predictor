"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerEntry, TournamentStatus } from "@/lib/types";

interface TournamentStandingsProps {
  standings: PlayerEntry[];
  userPrediction: PlayerEntry[] | null;
  status: TournamentStatus;
}

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function getPredictedRank(
  playerId: string,
  prediction: PlayerEntry[] | null,
): number | null {
  if (!prediction) return null;
  const entry = prediction.find((p) => p.id === playerId);
  return entry?.rank ?? null;
}

function isHighlighted(
  liveRank: number,
  predictedRank: number | null,
): boolean {
  if (predictedRank === null) return false;
  return Math.abs(liveRank - predictedRank) <= 1;
}

export function TournamentStandings({
  standings,
  userPrediction,
  status,
}: TournamentStandingsProps) {
  const sorted = [...standings].sort((a, b) => a.rank - b.rank);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Standings</CardTitle>
          {status === "active" && (
            <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
          )}
          {status === "completed" && <Badge variant="secondary">Final</Badge>}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul>
          {sorted.map((player) => {
            const predictedRank = getPredictedRank(player.id, userPrediction);
            const highlight = isHighlighted(player.rank, predictedRank);

            return (
              <li
                key={player.id}
                className={`flex items-center gap-4 px-4 py-3 border-b last:border-b-0 transition-colors ${
                  highlight
                    ? "bg-emerald-50 dark:bg-emerald-950/30"
                    : "bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-muted/50"
                }`}
              >
                {/* Rank */}
                <div className="w-7 flex-shrink-0 text-center">
                  {player.rank <= 3 ? (
                    <span className="text-base">
                      {RANK_MEDALS[player.rank]}
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-slate-500">
                      {player.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white tracking-wide">
                    {player.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                </div>

                {/* Name */}
                <div className="flex-grow min-w-0">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
                    {player.name}
                  </p>
                  {predictedRank !== null && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your pick: #{predictedRank}
                    </p>
                  )}
                </div>

                {/* Highlight indicator */}
                {highlight && (
                  <div className="flex-shrink-0">
                    <span className="text-emerald-600 text-xs font-semibold">
                      {predictedRank === player.rank ? "✓ Exact" : "≈ Close"}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
