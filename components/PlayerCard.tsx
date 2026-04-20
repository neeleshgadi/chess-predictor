"use client"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface Player {
  id: string;
  name: string;
  rating: number;
  country: string;
}

interface PlayerCardProps {
  player: Player;
  rank?: number;
}

export function PlayerCard({ player, rank }: PlayerCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: player.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: "relative" as const,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <Card className={`hover:border-primary transition-colors cursor-grab active:cursor-grabbing ${isDragging ? 'shadow-lg border-primary opacity-90' : ''}`}>
        <CardContent className="flex items-center p-4">
          {rank && (
            <div className="w-8 flex-shrink-0">
              <span className="text-xl font-bold text-muted-foreground">{rank}</span>
            </div>
          )}
          
          <Avatar className="h-10 w-10 mr-4 border">
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {player.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-grow">
            <h3 className="font-semibold text-lg leading-none mb-1">{player.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{player.country}</span>
              <span>•</span>
              <span>{player.rating}</span>
            </div>
          </div>
          
          <Badge variant="outline" className="ml-auto text-muted-foreground bg-background">
            ⋮⋮ Drag
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}