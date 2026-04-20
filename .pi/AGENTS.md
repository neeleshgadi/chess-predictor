# Chess Prediction Project - Context for AI Agents

## Project Overview
A platform for chess fans to predict the final standings of Round Robin chess tournaments (e.g., the Candidates Tournament, Tata Steel Chess). Users predict the exact order of the leaderboard before the tournament begins. After the tournament, users score points based on how close their prediction matches the actual results.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Database & Auth:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS + shadcn/ui
- **UI Interactions:** `@dnd-kit/core` (for drag-and-drop ranking)
- **Language:** TypeScript

## Core Features
1. **Drag and Drop Prediction:** Users drag player cards to rank participants from 1st to Nth place.
2. **Lock-out Mechanism:** Strict enforcement preventing predictions from being created or modified once the tournament's `start_date` passes.
3. **Scoring System:** Displacement/distance logic (e.g., comparing predicted rank vs. actual rank) or a fixed positional points system.
4. **Leaderboards:** Global user leaderboard aggregating points across all tournaments.

## Database Schema Overview (Proposed)
- `profiles`: User ID, username, avatar, total accumulated points.
- `tournaments`: ID, name, `start_date`, `end_date`, status, `official_results` (array of player IDs).
- `players`: ID, name, FIDE rating, country code, photo URL.
- `predictions`: ID, `user_id`, `tournament_id`, `ranked_list` (JSONB array of player IDs), `points_earned`.

## Recommended Folder Structure
- `/app/(auth)`: Supabase login/signup pages.
- `/app/tournaments/[id]`: Interactive prediction page (drag and drop).
- `/app/leaderboard`: Global rankings.
- `/components/ui`: shadcn/ui generic components.
- `/components/chess`: Domain-specific components (PlayerCard, RankingList, CountdownTimer).
- `/lib/supabase`: Database client initialization.
- `/lib/scoring`: Core logic for calculating points.

## AI Agent Guidelines & Coding Conventions
- **Rendering:** Default to Next.js Server Components. Only use `"use client"` when necessary (e.g., for `dnd-kit` components, stateful hooks, and interactive UI).
- **Mutations:** Use Next.js Server Actions for form submissions and database mutations (like saving a user's prediction).
- **Styling:** Use Tailwind CSS utility classes. Avoid custom CSS unless absolutely necessary.
- **Components:** Rely on `shadcn/ui` patterns for clean, accessible interfaces.
- **Typing:** Ensure strict TypeScript typing, especially for Supabase database definitions.