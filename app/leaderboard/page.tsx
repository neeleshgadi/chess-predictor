import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const revalidate = 0; // Ensure the page always shows the freshest data

export default async function LeaderboardPage() {
  // Fetch predictions from the database, newest first
  const { data: predictions, error } = await supabase
    .from('predictions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-10 text-red-500">Error loading predictions: {error.message}</div>
  }

  return (
    <main className="max-w-4xl mx-auto p-6 mt-10 min-h-screen">
      <div className="flex items-center justify-between mb-8 border-b pb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 tracking-tight">Community Predictions</h1>
          <p className="text-muted-foreground text-lg">
            See what everyone else thinks will happen!
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">Back to Predict</Button>
        </Link>
      </div>

      {predictions?.length === 0 ? (
        <div className="text-center p-10 bg-secondary/20 rounded-xl border border-border/50">
          <p className="text-muted-foreground">No predictions have been submitted yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {predictions?.map((prediction) => (
            <Card key={prediction.id} className="overflow-hidden shadow-sm">
              <CardHeader className="bg-secondary/30 pb-4">
                <CardTitle className="text-xl">
                  {prediction.user_name}&apos;s List
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Submitted: {new Date(prediction.created_at).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {/* We only show the Top 3 predictions on the card so it doesn't get too tall */}
                  {prediction.ranked_list.slice(0, 3).map((player: any) => (
                    <li key={player.id} className="p-4 flex items-center">
                      <span className="w-8 text-lg font-bold text-muted-foreground">
                        {player.rank}
                      </span>
                      <span className="font-semibold text-md">{player.name}</span>
                      {player.rank === 1 && <span className="ml-auto text-xl">🏆</span>}
                      {player.rank === 2 && <span className="ml-auto text-xl">🥈</span>}
                      {player.rank === 3 && <span className="ml-auto text-xl">🥉</span>}
                    </li>
                  ))}
                </ul>
                <div className="p-3 bg-secondary/10 text-xs text-center text-muted-foreground border-t">
                  ... and {prediction.ranked_list.length - 3} more
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}