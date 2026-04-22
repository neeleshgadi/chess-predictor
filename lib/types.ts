export interface PlayerEntry {
  rank: number;
  id: string;
  name: string;
}

export interface Prediction {
  id: string;
  user_name: string;
  tournament_name: string;
  ranked_list: PlayerEntry[];
  score: number | null;
  created_at: string;
}

export interface TournamentResult {
  id: string;
  tournament_name: string;
  final_standings: PlayerEntry[];
  created_at: string;
}

export type TournamentStatus = "upcoming" | "active" | "completed";

export interface LiveStandings {
  id: string;
  tournament_id: string;
  tournament_name: string;
  standings: PlayerEntry[];
  status: TournamentStatus;
  fetched_at: string;
  scored_at: string | null;
  source?: "lichess" | "chessdotcom";
  start_date: string | null;
  end_date: string | null;
}

export type BadgeType =
  | "sharp_eye"
  | "perfect_call"
  | "seasoned_analyst"
  | "podium_finish";

export interface UserBadge {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  tournament_id: string | null;
  awarded_at: string;
}

export interface CumulativeLeaderboardEntry {
  user_name: string;
  cumulative_score: number;
  tournaments_played: number;
}

export const BADGE_METADATA: Record<
  BadgeType,
  { name: string; description: string }
> = {
  sharp_eye: {
    name: "Sharp Eye",
    description: "Predicted at least one player in the exact correct position.",
  },
  perfect_call: {
    name: "Perfect Call",
    description: "Achieved the maximum possible score for a tournament.",
  },
  seasoned_analyst: {
    name: "Seasoned Analyst",
    description:
      "Submitted scored predictions for 3 or more distinct tournaments.",
  },
  podium_finish: {
    name: "Podium Finish",
    description: "Finished in the top 3 on a tournament leaderboard.",
  },
};
