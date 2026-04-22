"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayerCard } from "@/components/PlayerCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { LiveStandings, PlayerEntry } from "@/lib/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

export default function Home() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [tournament, setTournament] = useState<LiveStandings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null),
    );
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchTournament() {
      setLoading(true);
      // Fetch the most recent upcoming or active tournament
      const { data } = await supabase
        .from("live_standings")
        .select("*")
        .in("status", ["upcoming", "active"])
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setTournament(data as LiveStandings);
        setPlayers((data as LiveStandings).standings ?? []);
      }
      setLoading(false);
    }
    fetchTournament();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPlayers((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  async function handleSubmit() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!tournament) return;
    setIsSubmitting(true);
    const rankedList = players.map((p, index) => ({
      rank: index + 1,
      id: p.id,
      name: p.name,
    }));
    const displayName = user.email?.split("@")[0] || "Anonymous";
    const { error } = await supabase
      .from("predictions")
      .insert([
        {
          user_name: displayName,
          ranked_list: rankedList,
          tournament_name: tournament.tournament_name,
        },
      ]);
    setIsSubmitting(false);
    if (error) {
      alert("Error saving prediction: " + error.message);
    } else {
      alert("Prediction locked in successfully!");
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-10 pb-8 border-b border-[#E2E8F0]">
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-[#64748B] mb-3">
          {tournament?.tournament_name ?? "Chess Predictor"}
        </p>
        <h1
          className="text-4xl font-bold text-[#0F172A] mb-3"
          style={{ letterSpacing: "-0.02em" }}
        >
          Predict the{" "}
          <span
            className="text-highlight"
            style={
              {
                "--highlight-color": "var(--highlight-yellow)",
              } as React.CSSProperties
            }
          >
            Final Standings
          </span>
        </h1>
        <p className="text-[#64748B] text-base leading-relaxed">
          Drag and drop the players into your predicted order, then lock in your
          pick.
        </p>
        <div className="flex items-center justify-between mt-6">
          {user ? (
            <span className="text-xs tracking-[0.05em] uppercase text-[#64748B]">
              Signed in as{" "}
              <span className="text-[#334155] font-bold">
                {user.email?.split("@")[0]}
              </span>
            </span>
          ) : (
            <span className="text-xs tracking-[0.05em] uppercase text-[#64748B]">
              Not signed in
            </span>
          )}
          <Link href="/leaderboard">
            <Button
              variant="outline"
              className="text-xs tracking-[0.05em] uppercase border-[#E2E8F0] text-[#64748B] hover:border-[#0F172A] hover:text-[#0F172A] rounded-lg"
            >
              View Predictions
            </Button>
          </Link>
        </div>
      </div>

      {/* Player list */}
      {loading ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-16 text-center">
          <p className="text-xs tracking-[0.1em] uppercase text-[#64748B]">
            Loading tournament…
          </p>
        </div>
      ) : !tournament ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-16 text-center">
          <p className="text-xs tracking-[0.1em] uppercase text-[#64748B]">
            No active tournament right now.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={players.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y divide-[#E2E8F0]">
                {players.map((player, index) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    rank={index + 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Footer action */}
      {tournament && (
        <div className="mt-8 flex items-center justify-between">
          <p className="text-xs tracking-[0.05em] uppercase text-[#64748B]">
            {tournament.start_date && tournament.end_date
              ? `${tournament.start_date} → ${tournament.end_date}`
              : "Upcoming tournament"}
          </p>
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || players.length === 0}
            className="text-xs tracking-[0.05em] uppercase font-bold rounded-lg bg-[#0F172A] text-white hover:bg-[#1E293B] px-8"
          >
            {isSubmitting
              ? "Saving..."
              : user
                ? "Submit Prediction"
                : "Sign in to Submit"}
          </Button>
        </div>
      )}
    </main>
  );
}
