"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect } from "react";

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

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function PlayerCard({ player, rank }: PlayerCardProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    zIndex: isDragging ? 10 : 1,
    position: "relative" as const,
  };

  if (!isMounted) {
    return <div className="h-[72px] w-full bg-[#F8FAFC] animate-pulse" />;
  }

  const initials = player.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`touch-none select-none cursor-grab active:cursor-grabbing transition-colors ${
        isDragging ? "bg-[#F8FAFC] shadow-md" : "bg-white hover:bg-[#F8FAFC]"
      }`}
    >
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Rank */}
        <div className="w-7 flex-shrink-0 text-center">
          {rank && rank <= 3 ? (
            <span className="text-base">{RANK_MEDALS[rank]}</span>
          ) : (
            <span
              className="text-sm font-bold text-[#64748B]"
              style={{ fontFamily: "var(--font-primary)" }}
            >
              {rank}
            </span>
          )}
        </div>

        {/* Avatar */}
        <div className="h-9 w-9 rounded-full bg-[#0F172A] flex items-center justify-center flex-shrink-0">
          <span
            className="text-xs font-bold text-white tracking-wide"
            style={{ fontFamily: "var(--font-primary)" }}
          >
            {initials}
          </span>
        </div>

        {/* Info */}
        <div className="flex-grow min-w-0">
          <p
            className="font-bold text-[#0F172A] text-sm leading-tight truncate"
            style={{ fontFamily: "var(--font-primary)" }}
          >
            {player.name}
          </p>
          <p
            className="text-xs tracking-[0.05em] uppercase text-[#64748B] mt-0.5"
            style={{ fontFamily: "var(--font-primary)" }}
          >
            {player.country} · {player.rating}
          </p>
        </div>

        {/* Drag handle */}
        <div className="flex-shrink-0 flex flex-col gap-[3px] opacity-30">
          <div className="flex gap-[3px]">
            <div className="w-[3px] h-[3px] rounded-full bg-[#64748B]" />
            <div className="w-[3px] h-[3px] rounded-full bg-[#64748B]" />
          </div>
          <div className="flex gap-[3px]">
            <div className="w-[3px] h-[3px] rounded-full bg-[#64748B]" />
            <div className="w-[3px] h-[3px] rounded-full bg-[#64748B]" />
          </div>
          <div className="flex gap-[3px]">
            <div className="w-[3px] h-[3px] rounded-full bg-[#64748B]" />
            <div className="w-[3px] h-[3px] rounded-full bg-[#64748B]" />
          </div>
        </div>
      </div>
    </div>
  );
}
