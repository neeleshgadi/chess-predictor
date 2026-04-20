"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { mockPlayers } from "@/lib/mockData"
import { PlayerCard } from "@/components/PlayerCard"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"

export default function Home() {
  const router = useRouter()
  const [players, setPlayers] = useState(mockPlayers)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Check if a user is logged in when the page loads
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setPlayers((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  async function handleSubmit() {
    if (!user) {
      // If they are not logged in, send them to the login page!
      router.push("/login")
      return
    }

    setIsSubmitting(true)

    const rankedList = players.map((p, index) => ({
      rank: index + 1,
      id: p.id,
      name: p.name
    }))

    // We use the first part of their email as their "Username"
    const displayName = user.email?.split('@')[0] || "Anonymous"

    const { error } = await supabase
      .from('predictions')
      .insert([
        { user_name: displayName, ranked_list: rankedList }
      ])

    setIsSubmitting(false)

    if (error) {
      alert("Error saving prediction: " + error.message)
      console.error(error)
    } else {
      alert("🎉 Prediction locked in successfully! Check your Supabase database.")
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6 mt-10 min-h-screen">
      <div className="flex justify-between items-end mb-8 border-b pb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 tracking-tight">Candidates Tournament</h1>
          <p className="text-muted-foreground text-lg">
            Predict the final standings. Drag and drop the players into your predicted order.
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {user && <span className="text-sm text-muted-foreground">Logged in as {user.email}</span>}
          <Link href="/leaderboard">
            <Button variant="outline">View Leaderboard</Button>
          </Link>
        </div>
      </div>

      <div className="bg-secondary/20 p-4 rounded-xl border border-border/50">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={players.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {players.map((player, index) => (
                <PlayerCard key={player.id} player={player} rank={index + 1} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Make sure your prediction is final. Lock-in ends in 24 hours.
        </p>
        <Button 
          size="lg" 
          className={user ? "font-semibold bg-primary" : "font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80"} 
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : user ? "Submit Prediction" : "Sign in to Submit"}
        </Button>
      </div>
    </main>
  )
}