"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerEntry } from "@/lib/types";

// All players rated 2700+ from 2700chess.com (April 2026)
export const PLAYERS_2700: PlayerEntry[] = [
  { rank: 1, id: "carlsen_magnus", name: "Carlsen, Magnus" },
  { rank: 2, id: "nakamura_hikaru", name: "Nakamura, Hikaru" },
  { rank: 3, id: "caruana_fabiano", name: "Caruana, Fabiano" },
  { rank: 4, id: "abdusattorov_nodirbek", name: "Abdusattorov, Nodirbek" },
  { rank: 5, id: "sindarov_javokhir", name: "Sindarov, Javokhir" },
  { rank: 6, id: "giri_anish", name: "Giri, Anish" },
  { rank: 7, id: "keymer_vincent", name: "Keymer, Vincent" },
  { rank: 8, id: "firouzja_alireza", name: "Firouzja, Alireza" },
  { rank: 9, id: "so_wesley", name: "So, Wesley" },
  { rank: 10, id: "wei_yi", name: "Wei, Yi" },
  { rank: 11, id: "erigaisi_arjun", name: "Erigaisi, Arjun" },
  { rank: 12, id: "niemann_hans_moke", name: "Niemann, Hans Moke" },
  { rank: 13, id: "duda_jan_krzysztof", name: "Duda, Jan-Krzysztof" },
  { rank: 14, id: "ding_liren", name: "Ding, Liren" },
  { rank: 15, id: "van_foreest_jorden", name: "Van Foreest, Jorden" },
  { rank: 16, id: "praggnanandhaa_r", name: "Praggnanandhaa R" },
  { rank: 17, id: "gukesh_d", name: "Gukesh D" },
  { rank: 18, id: "dominguez_perez_leinier", name: "Dominguez Perez, Leinier" },
  { rank: 19, id: "le_quang_liem", name: "Le, Quang Liem" },
  { rank: 20, id: "nepomniachtchi_ian", name: "Nepomniachtchi, Ian" },
  { rank: 21, id: "rapport_richard", name: "Rapport, Richard" },
  { rank: 22, id: "aronian_levon", name: "Aronian, Levon" },
  { rank: 23, id: "nihal_sarin", name: "Nihal Sarin" },
  { rank: 24, id: "maghsoodloo_parham", name: "Maghsoodloo, Parham" },
  { rank: 25, id: "vachier_lagrave_maxime", name: "Vachier-Lagrave, Maxime" },
  { rank: 26, id: "yu_yangyi", name: "Yu, Yangyi" },
  { rank: 27, id: "mamedyarov_shakhriyar", name: "Mamedyarov, Shakhriyar" },
  { rank: 28, id: "tabatabaei_m_amin", name: "Tabatabaei, M. Amin" },
  { rank: 29, id: "andreikin_dmitry", name: "Andreikin, Dmitry" },
  { rank: 30, id: "erdogmus_yagiz_kaan", name: "Erdogmus, Yagiz Kaan" },
  { rank: 31, id: "vidit_santosh_gujrathi", name: "Vidit, Santosh Gujrathi" },
  { rank: 32, id: "liang_awonder", name: "Liang, Awonder" },
  { rank: 33, id: "fedoseev_vladimir", name: "Fedoseev, Vladimir" },
];

export interface TournamentFormValues {
  tournament_name: string;
  tournament_id: string;
  source: "lichess" | "chessdotcom" | "";
  start_date: string;
  end_date: string;
}

export interface TournamentFormProps {
  initialValues?: TournamentFormValues;
  tournamentId?: string;
  onSuccess: (tournamentId: string) => void;
  onCancel?: () => void;
}

/**
 * Adds a player to the roster with rank = roster.length + 1.
 * If the player ID already exists, returns the roster unchanged.
 * Returns a new array (immutable).
 */
export function addPlayer(
  roster: PlayerEntry[],
  id: string,
  name: string,
): PlayerEntry[] {
  if (roster.some((player) => player.id === id)) {
    return roster;
  }
  return [...roster, { rank: roster.length + 1, id, name }];
}

/**
 * Removes the player at the given index and reassigns ranks.
 * Returns a new array (immutable).
 */
export function removePlayer(
  roster: PlayerEntry[],
  index: number,
): PlayerEntry[] {
  const newRoster = roster.filter((_, i) => i !== index);
  return assignRanks(newRoster);
}

/**
 * Moves the player at fromIndex to toIndex and reassigns ranks.
 * Returns a new array (immutable).
 */
export function reorderPlayers(
  roster: PlayerEntry[],
  fromIndex: number,
  toIndex: number,
): PlayerEntry[] {
  const newRoster = [...roster];
  const [movedPlayer] = newRoster.splice(fromIndex, 1);
  newRoster.splice(toIndex, 0, movedPlayer);
  return assignRanks(newRoster);
}

/**
 * Sets rank = index + 1 for every entry.
 * Returns a new array (immutable).
 */
export function assignRanks(roster: PlayerEntry[]): PlayerEntry[] {
  return roster.map((player, index) => ({
    ...player,
    rank: index + 1,
  }));
}

const EMPTY_FIELDS: TournamentFormValues = {
  tournament_name: "",
  tournament_id: "",
  source: "",
  start_date: "",
  end_date: "",
};

// Sortable row for a single player in the roster
function SortablePlayerRow({
  player,
  onRemove,
}: {
  player: PlayerEntry;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground focus:outline-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
      <span className="w-6 text-center font-mono text-xs text-muted-foreground">
        {player.rank}
      </span>
      <span className="flex-1 font-medium">{player.name}</span>
      <span className="text-xs text-muted-foreground">{player.id}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 text-muted-foreground hover:text-destructive focus:outline-none"
        aria-label={`Remove ${player.name}`}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function validate(
  fields: TournamentFormValues,
  roster: PlayerEntry[],
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!fields.tournament_name.trim()) {
    errors.tournament_name = "Tournament name is required.";
  }
  if (!fields.start_date) {
    errors.start_date = "Start date is required.";
  }
  if (!fields.end_date) {
    errors.end_date = "End date is required.";
  }
  if (
    fields.start_date &&
    fields.end_date &&
    fields.end_date < fields.start_date
  ) {
    errors.end_date = "End date must be on or after start date.";
  }
  if (roster.length < 2) {
    errors.roster = "At least 2 players are required.";
  }

  return errors;
}

export default function TournamentForm({
  initialValues,
  tournamentId,
  onSuccess,
  onCancel,
}: TournamentFormProps) {
  const [fields, setFields] = useState<TournamentFormValues>(
    initialValues ?? EMPTY_FIELDS,
  );
  const [roster, setRoster] = useState<PlayerEntry[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [newPlayerId, setNewPlayerId] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [addPlayerError, setAddPlayerError] = useState("");

  // Pre-populate when editing
  useEffect(() => {
    if (initialValues) {
      setFields(initialValues);
    }
  }, [initialValues]);

  const sensors = useSensors(useSensor(PointerSensor));

  function handleFieldChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function handleAddPlayer() {
    const name = newPlayerName.trim();
    if (!name) {
      setAddPlayerError("Player name is required.");
      return;
    }
    // Auto-generate ID from name (lowercase, underscores)
    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    if (roster.some((p) => p.id === id)) {
      setAddPlayerError(`"${name}" already exists in the roster.`);
      return;
    }
    setRoster((prev) => addPlayer(prev, id, name));
    setNewPlayerName("");
    setAddPlayerError("");
    if (errors.roster) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n.roster;
        return n;
      });
    }
  }

  function handleRemovePlayer(index: number) {
    setRoster((prev) => removePlayer(prev, index));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = roster.findIndex((p) => p.id === active.id);
    const toIndex = roster.findIndex((p) => p.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      setRoster((prev) => reorderPlayers(prev, fromIndex, toIndex));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validate(fields, roster);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const url = tournamentId
        ? `/api/admin/tournaments/${tournamentId}`
        : "/api/admin/tournaments";
      const method = tournamentId ? "PATCH" : "POST";

      // Auto-generate tournament_id from name if not editing
      const autoId = tournamentId
        ? fields.tournament_id
        : fields.tournament_name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "") +
          "_" +
          Date.now();

      const body = {
        tournament_id: autoId,
        tournament_name: fields.tournament_name,
        source: fields.source || "lichess",
        start_date: fields.start_date,
        end_date: fields.end_date,
        standings: roster,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data?.error ?? "An unexpected error occurred.");
        return;
      }

      const returnedId = data.tournament_id ?? fields.tournament_id;
      onSuccess(returnedId);

      // Reset form on success
      setFields(EMPTY_FIELDS);
      setRoster([]);
      setErrors({});
      setNewPlayerId("");
      setNewPlayerName("");
      setAddPlayerError("");
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Tournament Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="tournament_name" className="text-sm font-medium">
          Tournament Name
        </label>
        <input
          id="tournament_name"
          name="tournament_name"
          type="text"
          value={fields.tournament_name}
          onChange={handleFieldChange}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          placeholder="e.g. Norway Chess 2026"
        />
        {errors.tournament_name && (
          <p className="text-xs text-destructive">{errors.tournament_name}</p>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="start_date" className="text-sm font-medium">
            Start Date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            value={fields.start_date}
            onChange={handleFieldChange}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          />
          {errors.start_date && (
            <p className="text-xs text-destructive">{errors.start_date}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="end_date" className="text-sm font-medium">
            End Date
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            value={fields.end_date}
            onChange={handleFieldChange}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          />
          {errors.end_date && (
            <p className="text-xs text-destructive">{errors.end_date}</p>
          )}
        </div>
      </div>

      {/* Player Roster */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            Player Roster ({roster.length} added)
          </p>
        </div>

        {/* Added players with scroll */}
        {roster.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={roster.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                {roster.map((player, index) => (
                  <SortablePlayerRow
                    key={player.id}
                    player={player}
                    onRemove={() => handleRemovePlayer(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {errors.roster && (
          <p className="text-xs text-destructive">{errors.roster}</p>
        )}

        {/* 2700+ player picker */}
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground font-medium">
            Pick from 2700+ rated players:
          </p>
          <input
            type="text"
            value={newPlayerId}
            onChange={(e) => setNewPlayerId(e.target.value)}
            placeholder="Search by name…"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          />
          <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5 rounded-lg border border-border bg-background p-1">
            {PLAYERS_2700.filter(
              (p) =>
                !roster.some((r) => r.id === p.id) &&
                p.name.toLowerCase().includes(newPlayerId.toLowerCase()),
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setRoster((prev) => addPlayer(prev, p.id, p.name));
                  if (errors.roster)
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.roster;
                      return n;
                    });
                }}
                className="flex items-center justify-between px-3 py-1.5 text-sm rounded hover:bg-muted text-left"
              >
                <span>{p.name}</span>
                <span className="text-xs text-muted-foreground">+ Add</span>
              </button>
            ))}
            {PLAYERS_2700.filter(
              (p) =>
                !roster.some((r) => r.id === p.id) &&
                p.name.toLowerCase().includes(newPlayerId.toLowerCase()),
            ).length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">
                All players added
              </p>
            )}
          </div>
        </div>
        {/* Manual entry for players not in the list */}
        <div className="flex flex-col gap-1 pt-1 border-t border-border">
          <p className="text-xs text-muted-foreground font-medium">
            Add player manually:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Full name"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddPlayer();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPlayer}
            >
              Add
            </Button>
          </div>
        </div>
        {addPlayerError && (
          <p className="text-xs text-destructive">{addPlayerError}</p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting
            ? tournamentId
              ? "Saving…"
              : "Creating…"
            : tournamentId
              ? "Save Changes"
              : "Create Tournament"}
        </Button>
      </div>
    </form>
  );
}
