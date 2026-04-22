import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProfileStats } from "@/components/ProfileStats";
import { BadgeGrid } from "@/components/BadgeGrid";
import type {
  Prediction,
  PlayerEntry,
  UserBadge,
  LiveStandings,
} from "@/lib/types";

export const revalidate = 0;

/** Read the Supabase session from cookies server-side. */
async function getServerSession() {
  const cookieStore = await cookies();

  // Supabase v2 stores the session in cookies prefixed with "sb-"
  const allCookies = cookieStore.getAll();
  const authCookie = allCookies.find(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"),
  );

  if (!authCookie) return null;

  let session: {
    access_token: string;
    user: { id: string; email?: string };
  } | null = null;
  try {
    const parsed = JSON.parse(authCookie.value);
    // Supabase stores [access_token, refresh_token, ...] or the full session object
    if (Array.isArray(parsed)) {
      // Older format: [access_token, refresh_token, provider_token, provider_refresh_token, expires_at]
      const accessToken = parsed[0];
      if (!accessToken) return null;
      // Decode the JWT payload to get user info
      const payloadB64 = accessToken.split(".")[1];
      if (!payloadB64) return null;
      const payload = JSON.parse(
        Buffer.from(payloadB64, "base64").toString("utf-8"),
      );
      session = {
        access_token: accessToken,
        user: { id: payload.sub, email: payload.email },
      };
    } else if (parsed?.access_token) {
      session = parsed;
    }
  } catch {
    return null;
  }

  return session;
}

export default async function ProfilePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;
  const userEmail = session.user.email ?? "";
  const userName = userEmail.split("@")[0] || "Anonymous";

  // --- Fetch predictions (ordered by created_at DESC) ---
  const { data: predictions, error: predictionsError } = await supabaseAdmin
    .from("predictions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (predictionsError) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-sm text-red-500 font-bold tracking-[0.05em] uppercase">
          Error loading predictions: {predictionsError.message}
        </p>
      </main>
    );
  }

  const predictionList = (predictions as Prediction[]) ?? [];

  // Compute cumulative score and tournaments played
  const cumulativeScore = predictionList.reduce(
    (sum, p) => sum + (p.score ?? 0),
    0,
  );
  const tournamentsPlayed = new Set(
    predictionList.map((p) => p.tournament_name),
  ).size;

  // --- Fetch user badges (independent — failures show fallback only in badge section) ---
  let badges: UserBadge[] = [];
  let badgesError = false;

  const { data: badgeData, error: badgeFetchError } = await supabaseAdmin
    .from("user_badges")
    .select("*")
    .eq("user_id", userId);

  if (badgeFetchError) {
    badgesError = true;
  } else {
    badges = (badgeData as UserBadge[]) ?? [];
  }

  // --- Resolve tournament names for badges ---
  // Collect unique tournament_ids from badges that have one
  const tournamentIds = [
    ...new Set(badges.map((b) => b.tournament_id).filter(Boolean) as string[]),
  ];

  const tournamentNames: Record<string, string> = {};

  if (tournamentIds.length > 0) {
    const { data: standings } = await supabaseAdmin
      .from("live_standings")
      .select("tournament_id, tournament_name")
      .in("tournament_id", tournamentIds);

    if (standings) {
      for (const row of standings as Pick<
        LiveStandings,
        "tournament_id" | "tournament_name"
      >[]) {
        tournamentNames[row.tournament_id] = row.tournament_name;
      }
    }

    // For any tournament_id not found in live_standings, fall back to the raw
    // tournament_name stored on the prediction that matches this tournament_id.
    for (const tid of tournamentIds) {
      if (!tournamentNames[tid]) {
        const match = predictionList.find((p) => p.tournament_name === tid);
        if (match) tournamentNames[tid] = match.tournament_name;
      }
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-10 pb-8 border-b border-[#E2E8F0] flex items-end justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#64748B] mb-3">
            My Profile
          </p>
          <h1
            className="text-4xl font-bold text-[#0F172A] mb-3"
            style={{ letterSpacing: "-0.02em" }}
          >
            {userName}&apos;s{" "}
            <span
              className="text-highlight"
              style={
                {
                  "--highlight-color": "var(--highlight-cyan)",
                } as React.CSSProperties
              }
            >
              Predictions
            </span>
          </h1>
          <p className="text-[#64748B] text-base">
            {predictionList.length} prediction
            {predictionList.length !== 1 ? "s" : ""} submitted
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

      {/* Cumulative stats */}
      <div className="mb-10">
        <ProfileStats
          cumulativeScore={cumulativeScore}
          tournamentsPlayed={tournamentsPlayed}
        />
      </div>

      {/* Badge section */}
      <div className="mb-10">
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#64748B] mb-4">
          Badges
        </p>
        {badgesError ? (
          <p className="text-sm text-[#64748B] py-4">
            Badges unavailable — please try again later.
          </p>
        ) : (
          <BadgeGrid badges={badges} tournamentNames={tournamentNames} />
        )}
      </div>

      {/* Tournament history */}
      <div>
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#64748B] mb-4">
          Tournament History
        </p>
        {predictionList.length === 0 ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-16 text-center">
            <p className="text-xs tracking-[0.1em] uppercase text-[#64748B]">
              You haven&apos;t submitted any predictions yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {predictionList.map((prediction) => (
              <div
                key={prediction.id}
                className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden"
              >
                {/* Card header */}
                <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#0F172A] text-sm mb-0.5">
                      {prediction.tournament_name}
                    </p>
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
                        Awaiting Results
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Full ranked list */}
                <ul className="divide-y divide-[#E2E8F0]">
                  {prediction.ranked_list.map((player: PlayerEntry) => (
                    <li
                      key={player.id}
                      className="flex items-center gap-4 px-5 py-3"
                    >
                      <span className="text-base w-6 text-center flex-shrink-0">
                        {player.rank === 1 ? (
                          "🥇"
                        ) : player.rank === 2 ? (
                          "🥈"
                        ) : player.rank === 3 ? (
                          "🥉"
                        ) : (
                          <span className="text-sm font-bold text-[#64748B]">
                            {player.rank}
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-bold text-[#0F172A]">
                        {player.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
