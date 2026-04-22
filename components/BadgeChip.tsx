import { Badge } from "@/components/ui/badge";
import { BADGE_METADATA, type UserBadge } from "@/lib/types";

interface BadgeChipProps {
  badge: UserBadge;
  tournamentName?: string | null;
}

export function BadgeChip({ badge, tournamentName = null }: BadgeChipProps) {
  const meta = BADGE_METADATA[badge.badge_type];

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <Badge variant="secondary" className="w-fit">
        {meta.name}
      </Badge>
      <p className="text-xs text-[#64748B] leading-snug">{meta.description}</p>
      {tournamentName !== null && (
        <p className="text-xs font-medium text-[#0F172A] dark:text-slate-300 truncate">
          {tournamentName}
        </p>
      )}
    </div>
  );
}
