"use client";

import { useState } from "react";
import { LiveStandings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import TournamentForm from "@/components/TournamentForm";

interface NewTournamentButtonProps {
  onCreated?: (tournament: LiveStandings) => void;
}

export default function NewTournamentButton({
  onCreated,
}: NewTournamentButtonProps) {
  const [open, setOpen] = useState(false);

  function handleSuccess(tournamentId: string) {
    setOpen(false);
    if (onCreated) {
      // Minimal optimistic update — caller can refresh if needed
      onCreated({ tournament_id: tournamentId } as LiveStandings);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>New Tournament</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>New Tournament</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new tournament.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
            <TournamentForm
              onSuccess={handleSuccess}
              onCancel={() => setOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
