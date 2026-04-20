# ♟️ Chess Predictor

**🌐 Live Demo:** [https://chess-predictor.vercel.app/](https://chess-predictor.vercel.app/)

A full-stack web application built for chess fans to predict the final standings of Round Robin tournaments (like the Candidates Tournament or Tata Steel). Users can drag and drop players into their predicted order, lock in their predictions, and view a community leaderboard.

## ✨ Features
- **Interactive Drag-and-Drop:** Intuitive interface built with `@dnd-kit` to easily rank players from 1st to 8th place.
- **Secure Authentication:** User sign-up and login powered by Supabase Auth.
- **Live Database:** All predictions are permanently stored in a cloud PostgreSQL database.
- **Community Leaderboard:** A public view showing everyone's locked-in predictions and top 3 podium picks.

## 🛠️ Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS & shadcn/ui
- **Interactivity:** `@dnd-kit/core` & `@dnd-kit/sortable`
- **Database & Auth:** Supabase

## 🚀 Local Setup

To run this project locally on your own machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/chess-predictor.git
   cd chess-predictor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add your Supabase keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.
