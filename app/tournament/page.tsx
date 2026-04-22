import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-server";
import { TournamentStandings } from "@/components/TournamentStandings";
import { Button } from "@/components/ui/button";
import type { LiveStandings, Prediction } from "@/lib/types";

export const revalidate = 0;

export default async function TournamentPage() {
  const tournamentId = process.env.TOURNAMENT_ID;

  // Fetch live standings from Supabase
  let liveStandings: LiveStandings | null = null;
  if (tournamentId) {
    const { data } = await supabaseAdmin
      .from("live_standings")
      .select("*")
      .eq("tournament_id", tournamentId)
      .single<LiveStandings>();
    liveStandings = data ?? null;
  }

  // Fetch authenticated user session via cookie-based client
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { cookie: cookieHeader } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const {
    data: { session },
  } = await supabaseAuth.auth.getSession();

  // Fetch the user's most recent prediction if authenticated
  let userPrediction: Prediction | null = null;
  if (session) {
    const userName = session.user.email?.split("@")[0] ?? null;
    if (userName) {
      const { data } = await supabaseAdmin
        .from("predictions")
        .select("*")
        .eq("user_name", userName)
        .order("created_at", { ascending: false })
        .limit(1)
        .single<Prediction>();
      userPrediction = data ?? null;
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-10 pb-8 border-b border-[#E2E8F0]">
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#64748B] mb-3">
          Tournament
        </p>
        <h1 className="text-4xl font-bold text-[#0F172A] mb-3 tracking-tight">
          {liveStandings?.tournament_name ?? "Live Standings"}
        </h1>
      </div>

      {/* No standings available */}
      {!liveStandings ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-16 text-center">
          <p className="text-xs tracking-[0.1em] uppercase text-[#64748B]">
            Standings not yet available
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Standings — takes up 2/3 */}
          <div className="lg:col-span-2">
            <TournamentStandings
              standings={liveStandings.standings}
              userPrediction={userPrediction?.ranked_list ?? null}
              status={liveStandings.status}
            />
          </div>

          {/* Prediction panel — takes up 1/3 */}
          <div className="lg:col-span-1">
            {session ? (
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
                <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#64748B] mb-4">
                  Your Prediction
                </p>
                {userPrediction ? (
                  <ul className="divide-y divide-[#E2E8F0]">
                    {userPrediction.ranked_list.map((player) => (
                      <li
                        key={player.id}
                        className="flex items-center gap-3 py-2"
                      >
                        <span className="text-sm font-bold text-[#64748B] w-5 text-center flex-shrink-0">
                          {player.rank}
                        </span>
                        <span className="text-sm font-bold text-[#0F172A]">
                          {player.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs tracking-[0.05em] uppercase text-[#64748B] mb-4">
                      No prediction submitted yet
                    </p>
                    <Link href="/">
                      <Button
                        variant="outline"
                        className="text-xs tracking-[0.05em] uppercase border-[#E2E8F0] text-[#64748B] hover:border-[#0F172A] hover:text-[#0F172A] rounded-lg"
                      >
                        Make a Prediction
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center">
                <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#64748B] mb-2">
                  Your Prediction
                </p>
                <p className="text-sm text-[#64748B] mb-6">
                  Log in to see how your picks compare to the live standings.
                </p>
                <Link href="/login">
                  <Button className="text-xs tracking-[0.05em] uppercase rounded-lg w-full">
                    Log In
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
