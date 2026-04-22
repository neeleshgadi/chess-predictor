import { Card, CardContent } from "@/components/ui/card";

interface ProfileStatsProps {
  cumulativeScore: number;
  tournamentsPlayed: number;
}

export function ProfileStats({
  cumulativeScore,
  tournamentsPlayed,
}: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium tracking-[0.05em] uppercase text-[#64748B]">
            Cumulative Score
          </p>
          <p className="mt-1 text-3xl font-bold text-[#0F172A] dark:text-slate-100">
            {cumulativeScore}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium tracking-[0.05em] uppercase text-[#64748B]">
            Tournaments Played
          </p>
          <p className="mt-1 text-3xl font-bold text-[#0F172A] dark:text-slate-100">
            {tournamentsPlayed}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
