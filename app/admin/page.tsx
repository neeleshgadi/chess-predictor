import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase-server";
import { LiveStandings } from "@/lib/types";
import TournamentList from "@/components/TournamentList";
import NewTournamentButton from "./NewTournamentButton";

export default async function AdminPage() {
  const auth = await requireAdmin();

  if (!auth.ok) {
    // Not logged in → redirect to login
    redirect("/login");
  }

  const { data: tournaments } = await supabaseAdmin
    .from("live_standings")
    .select("*")
    .order("fetched_at", { ascending: false });

  const initialTournaments: LiveStandings[] = tournaments ?? [];

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tournament Management</h1>
          <NewTournamentButton />
        </div>
        <TournamentList initialTournaments={initialTournaments} />
      </div>
    </main>
  );
}
