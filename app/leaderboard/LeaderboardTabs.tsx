"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { Prediction, CumulativeLeaderboardEntry } from "@/lib/types";

function ordinalRank(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

interface LeaderboardTabsProps {
  predictions: Prediction[];
  cumulativeEntries: CumulativeLeaderboardEntry[] | null;
  cumulativeError: string | null;
}

export default function LeaderboardTabs({
  predictions,
  cumulativeEntries,
  cumulativeError,
}: LeaderboardTabsProps) {
  const [activeTab, setActiveTab] = useState<"tournament" | "alltime">(
    "tournament",
  );

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab("tournament")}
          className={`px-4 py-2 text-xs font-bold tracking-[0.1em] uppercase rounded-lg border transition-colors ${
            activeTab === "tournament"
              ? "bg-[#0F172A] text-white border-[#0F172A]"
              : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#0F172A] hover:text-[#0F172A]"
          }`}
        >
          This Tournament
        </button>
        <button
          onClick={() => setActiveTab("alltime")}
          className={`px-4 py-2 text-xs font-bold tracking-[0.1em] uppercase rounded-lg border transition-colors ${
            activeTab === "alltime"
              ? "bg-[#0F172A] text-white border-[#0F172A]"
              : "bg-white text-[#64748B] border-[#E2E8F0] hover:border-[#0F172A] hover:text-[#0F172A]"
          }`}
        >
          All Time
        </button>
      </div>

      {/* This Tournament tab */}
      {activeTab === "tournament" && (
        <>
          {predictions.length === 0 ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-16 text-center">
              <p className="text-xs tracking-[0.1em] uppercase text-[#64748B]">
                No predictions yet — be the first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {predictions.map((prediction, index) => (
                <div
                  key={prediction.id}
                  className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden"
                >
                  {/* Card header */}
                  <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold tracking-[0.05em] uppercase text-[#64748B]">
                          {ordinalRank(index + 1)}
                        </span>
                        <p className="font-bold text-[#0F172A] text-sm">
                          {prediction.user_name}
                        </p>
                      </div>
                      <p className="text-xs tracking-[0.05em] uppercase text-[#64748B]">
                        {new Date(prediction.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {prediction.score !== null ? (
                        <span className="text-sm font-bold text-[#0F172A]">
                          {prediction.score} pts
                        </span>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-xs tracking-[0.05em] uppercase"
                        >
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Top 3 picks */}
                  <ul className="divide-y divide-[#E2E8F0]">
                    {prediction.ranked_list.slice(0, 3).map((player) => (
                      <li
                        key={player.id}
                        className="flex items-center gap-4 px-5 py-3"
                      >
                        <span className="text-base w-6 text-center">
                          {player.rank === 1
                            ? "🥇"
                            : player.rank === 2
                              ? "🥈"
                              : "🥉"}
                        </span>
                        <span className="text-sm font-bold text-[#0F172A]">
                          {player.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Footer */}
                  {prediction.ranked_list.length > 3 && (
                    <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0]">
                      <p className="text-xs tracking-[0.05em] uppercase text-[#64748B]">
                        +{prediction.ranked_list.length - 3} more picks
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* All Time tab */}
      {activeTab === "alltime" && (
        <>
          {cumulativeError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
              <p className="text-sm text-red-500 font-bold tracking-[0.05em] uppercase">
                Error loading all-time rankings: {cumulativeError}
              </p>
            </div>
          ) : !cumulativeEntries || cumulativeEntries.length === 0 ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-16 text-center">
              <p className="text-xs tracking-[0.1em] uppercase text-[#64748B]">
                No scored predictions yet — check back after the first
                tournament.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <th className="px-5 py-3 text-left text-xs font-bold tracking-[0.1em] uppercase text-[#64748B]">
                      Rank
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-bold tracking-[0.1em] uppercase text-[#64748B]">
                      Player
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-bold tracking-[0.1em] uppercase text-[#64748B]">
                      Total Pts
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-bold tracking-[0.1em] uppercase text-[#64748B]">
                      Tournaments
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {cumulativeEntries.map((entry, index) => (
                    <tr
                      key={entry.user_name}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="px-5 py-4 text-xs font-bold tracking-[0.05em] uppercase text-[#64748B]">
                        {ordinalRank(index + 1)}
                      </td>
                      <td className="px-5 py-4 font-bold text-[#0F172A] text-sm">
                        {entry.user_name}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-bold text-[#0F172A]">
                        {entry.cumulative_score} pts
                      </td>
                      <td className="px-5 py-4 text-right text-xs text-[#64748B]">
                        {entry.tournaments_played}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
