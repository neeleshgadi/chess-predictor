"use client";

import { useState } from "react";
import { LiveStandings } from "@/lib/types";
import { TournamentFormValues } from "@/components/TournamentForm";
import TournamentForm from "@/components/TournamentForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface TournamentListProps {
  initialTournaments: LiveStandings[];
  onTournamentCreated?: (tournament: LiveStandings) => void;
}

interface RowActionState {
  loading: boolean;
  error: string | null;
  result: string | null;
}

function statusBadgeVariant(
  status: LiveStandings["status"],
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "active") return "default";
  if (status === "completed") return "secondary";
  return "outline";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function TournamentList({
  initialTournaments,
}: TournamentListProps) {
  const [tournaments, setTournaments] =
    useState<LiveStandings[]>(initialTournaments);
  const [editTarget, setEditTarget] = useState<LiveStandings | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LiveStandings | null>(null);
  const [actionState, setActionState] = useState<
    Record<string, RowActionState>
  >({});

  function getRowState(id: string): RowActionState {
    return actionState[id] ?? { loading: false, error: null, result: null };
  }

  function setRowState(id: string, patch: Partial<RowActionState>) {
    setActionState((prev) => ({
      ...prev,
      [id]: { ...getRowState(id), ...patch },
    }));
  }

  // Called after a successful create from a parent-controlled TournamentForm
  function handleTournamentCreated(tournament: LiveStandings) {
    setTournaments((prev) => [tournament, ...prev]);
  }

  // Edit: map LiveStandings → TournamentFormValues
  function openEdit(t: LiveStandings) {
    setEditTarget(t);
  }

  function handleEditSuccess(tournamentId: string) {
    // Update the tournament name/dates in local state by re-fetching the row
    // We optimistically update what we can from editTarget
    setTournaments((prev) =>
      prev.map((t) =>
        t.tournament_id === tournamentId
          ? {
              ...t,
              tournament_name:
                editFormValues?.tournament_name ?? t.tournament_name,
              source:
                (editFormValues?.source as LiveStandings["source"]) ?? t.source,
              start_date: editFormValues?.start_date ?? t.start_date,
              end_date: editFormValues?.end_date ?? t.end_date,
            }
          : t,
      ),
    );
    setEditTarget(null);
  }

  // Derive form values from editTarget for pre-population
  const editFormValues: TournamentFormValues | undefined = editTarget
    ? {
        tournament_name: editTarget.tournament_name,
        tournament_id: editTarget.tournament_id,
        source: editTarget.source ?? "",
        start_date: editTarget.start_date ?? "",
        end_date: editTarget.end_date ?? "",
      }
    : undefined;

  // Delete
  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.tournament_id;
    setRowState(id, { loading: true, error: null, result: null });
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRowState(id, {
          loading: false,
          error: data?.error ?? "Delete failed.",
        });
        return;
      }
      setTournaments((prev) => prev.filter((t) => t.tournament_id !== id));
      setRowState(id, { loading: false, error: null, result: null });
    } catch {
      setRowState(id, { loading: false, error: "Network error." });
    }
  }

  // Refresh standings
  async function handleRefresh(t: LiveStandings) {
    const id = t.tournament_id;
    setRowState(id, { loading: true, error: null, result: null });
    try {
      const res = await fetch("/api/admin/refresh-standings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournament_id: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRowState(id, {
          loading: false,
          error: data?.error ?? "Refresh failed.",
        });
        return;
      }
      const newFetchedAt: string = data.fetched_at ?? new Date().toISOString();
      setTournaments((prev) =>
        prev.map((row) =>
          row.tournament_id === id ? { ...row, fetched_at: newFetchedAt } : row,
        ),
      );
      setRowState(id, { loading: false, error: null, result: null });
    } catch {
      setRowState(id, { loading: false, error: "Network error." });
    }
  }

  // Compute scores
  async function handleComputeScores(t: LiveStandings) {
    const id = t.tournament_id;
    setRowState(id, { loading: true, error: null, result: null });
    try {
      const res = await fetch("/api/admin/compute-scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentName: t.tournament_name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRowState(id, {
          loading: false,
          error: data?.error ?? "Compute scores failed.",
        });
        return;
      }
      const { updated = 0, badgesAwarded = 0, badgesFailed = 0 } = data;
      setRowState(id, {
        loading: false,
        error: null,
        result: `Updated: ${updated}, Badges awarded: ${badgesAwarded}, Badges failed: ${badgesFailed}`,
      });
    } catch {
      setRowState(id, { loading: false, error: "Network error." });
    }
  }

  return (
    <>
      {/* Tournament rows */}
      <div className="flex flex-col gap-3">
        {tournaments.length === 0 && (
          <p className="text-sm text-muted-foreground">No tournaments yet.</p>
        )}
        {tournaments.map((t) => {
          const rowState = getRowState(t.tournament_id);
          const isUpcoming = t.status === "upcoming";
          const isActive = t.status === "active";
          const isCompleted = t.status === "completed";

          return (
            <Card key={t.tournament_id} size="sm">
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {/* Info */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.tournament_name}</span>
                    <Badge
                      variant={statusBadgeVariant(t.status)}
                      className={
                        isActive
                          ? "bg-green-500/15 text-green-700 dark:text-green-400"
                          : undefined
                      }
                    >
                      {t.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ID: {t.tournament_id}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Fetched: {formatDate(t.fetched_at)}
                  </span>
                  {rowState.error && (
                    <p className="text-xs text-destructive">{rowState.error}</p>
                  )}
                  {rowState.result && (
                    <p className="text-xs text-green-700 dark:text-green-400">
                      {rowState.result}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {isUpcoming && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={rowState.loading}
                        onClick={() => openEdit(t)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={rowState.loading}
                        onClick={() => setDeleteTarget(t)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                  {(isUpcoming || isActive) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={rowState.loading}
                      onClick={() => handleRefresh(t)}
                    >
                      {rowState.loading ? "Refreshing…" : "Refresh Standings"}
                    </Button>
                  )}
                  {isCompleted && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={rowState.loading}
                      onClick={() => handleComputeScores(t)}
                    >
                      {rowState.loading ? "Computing…" : "Compute Scores"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Tournament</DialogTitle>
            <DialogDescription>
              Update the tournament details below.
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <div className="overflow-y-auto flex-1 pr-1">
              <TournamentForm
                initialValues={editFormValues}
                tournamentId={editTarget.tournament_id}
                onSuccess={handleEditSuccess}
                onCancel={() => setEditTarget(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tournament</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;
              {deleteTarget?.tournament_name}&quot;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { TournamentList };
export type { TournamentListProps };
