import { BadgeChip } from "@/components/BadgeChip";
import type { UserBadge } from "@/lib/types";

interface BadgeGridProps {
  badges: UserBadge[];
  tournamentNames: Record<string, string>;
}

export function BadgeGrid({ badges, tournamentNames }: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <p className="text-sm text-[#64748B] py-4 text-center">
        No badges yet — keep predicting to earn your first one!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {badges.map((badge) => (
        <BadgeChip
          key={badge.id}
          badge={badge}
          tournamentName={
            badge.tournament_id
              ? (tournamentNames[badge.tournament_id] ?? null)
              : null
          }
        />
      ))}
    </div>
  );
}
