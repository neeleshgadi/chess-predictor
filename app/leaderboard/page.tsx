import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Prediction, CumulativeLeaderboardEntry } from "@/lib/types";
import LeaderboardTabs from "./LeaderboardTabs";

export const revalidate = 0;

export default async function LeaderboardPage() {
  // Fetch per-tournament predictions
  const { data: predictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("*")
    .order("score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (predictionsError) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-sm text-red-500 font-bold tracking-[0.05em] uppercase">
          Error loading predictions: {predictionsError.message}
        </p>
      </main>
    );
  }

  // Fetch all-time cumulative leaderboard independently
  const { data: cumulativeData, error: cumulativeError } = await supabase
    .from("cumulative_leaderboard")
    .select("user_name, cumulative_score, tournaments_played");

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-10 pb-8 border-b border-[#E2E8F0] flex items-end justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#64748B] mb-3">
            Community
          </p>
          <h1
            className="text-4xl font-bold text-[#0F172A] mb-3"
            style={{ letterSpacing: "-0.02em" }}
          >
            All{" "}
            <span
              className="text-highlight"
              style={
                {
                  "--highlight-color": "var(--highlight-mint)",
                } as React.CSSProperties
              }
            >
              Predictions
            </span>
          </h1>
          <p className="text-[#64748B] text-base">
            {predictions?.length ?? 0} prediction
            {predictions?.length !== 1 ? "s" : ""} submitted
          </p>
        </div>
        <Link href="/">
          <Button
            variant="outline"
            className="text-xs tracking-[0.05em] uppercase border-[#E2E8F0] text-[#64748B] hover:border-[#0F172A] hover:text-[#0F172A] rounded-lg"
          >
            Back to Predict
          </Button>
        </Link>
      </div>

      <LeaderboardTabs
        predictions={(predictions as Prediction[]) ?? []}
        cumulativeEntries={
          cumulativeError
            ? null
            : ((cumulativeData as CumulativeLeaderboardEntry[]) ?? [])
        }
        cumulativeError={cumulativeError?.message ?? null}
      />
    </main>
  );
}
