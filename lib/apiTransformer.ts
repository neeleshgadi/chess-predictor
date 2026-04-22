import { PlayerEntry } from "./types";

export class TransformError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransformError";
  }
}

export function transformApiResponse(
  raw: unknown,
  source: "lichess" | "chessdotcom",
): PlayerEntry[] {
  if (
    raw === null ||
    typeof raw !== "object" ||
    !("players" in raw) ||
    !Array.isArray((raw as Record<string, unknown>).players)
  ) {
    throw new TransformError("Unrecognisable response shape");
  }

  const players = (raw as Record<string, unknown>).players as unknown[];
  const candidates: Array<{ id: string; name: string; sourceRank: number }> =
    [];

  for (const entry of players) {
    if (entry === null || typeof entry !== "object") continue;

    const obj = entry as Record<string, unknown>;
    const identifier =
      typeof obj.username === "string" ? obj.username : "unknown";
    const rank = obj.rank;

    if (typeof rank !== "number" || rank <= 0) {
      console.warn(
        `[apiTransformer] Discarding player with invalid rank: ${identifier}`,
      );
      continue;
    }

    candidates.push({ id: identifier, name: identifier, sourceRank: rank });
  }

  candidates.sort((a, b) => a.sourceRank - b.sourceRank);

  return candidates.map((c, i) => ({
    id: c.id,
    name: c.name,
    rank: i + 1,
  }));
}
