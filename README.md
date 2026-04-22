# ♟️ Chess Predictor

**🌐 Live App:** [chess-predictor.vercel.app](https://chess-predictor.vercel.app)

Chess Predictor is a prediction game for chess fans. Before a major tournament begins, you drag and drop players into your predicted final standings, lock in your picks, and earn points based on how accurate you were. Compete against other fans on the leaderboard and collect badges along the way.

---

## How It Works

### 1. Make Your Prediction

On the home page you'll see the player roster for the current tournament. Drag and drop them into the order you think they'll finish. When you're happy with your ranking, hit **Lock In Prediction**.

> You need to be logged in to save a prediction. If you're not, you'll be redirected to the login page first.

### 2. Watch the Tournament Unfold

The [Tournament page](/tournament) shows live standings updated automatically from the chess API. Your predicted order is highlighted alongside the real standings so you can track how well you're doing in real time.

### 3. Get Scored

Once the tournament ends, scores are computed automatically:

- **3 points** — player is in the exact correct position
- **1 point** — player is one position off

Your total score appears on your profile and on the leaderboard.

### 4. Earn Badges

After each tournament you can earn up to four badges:

| Badge                   | How to earn it                                              |
| ----------------------- | ----------------------------------------------------------- |
| 🎯 **Sharp Eye**        | Predicted at least one player in the exact correct position |
| 🏆 **Perfect Call**     | Achieved the maximum possible score for the tournament      |
| 📊 **Seasoned Analyst** | Submitted scored predictions for 3 or more tournaments      |
| 🥉 **Podium Finish**    | Finished in the top 3 on a tournament leaderboard           |

---

## Pages

| Page           | What's there                                                 |
| -------------- | ------------------------------------------------------------ |
| `/`            | Drag-and-drop prediction interface for the active tournament |
| `/tournament`  | Live standings with your prediction highlighted              |
| `/leaderboard` | This Tournament rankings + All-Time cumulative rankings      |
| `/profile`     | Your prediction history, scores, and earned badges           |
| `/login`       | Sign up or log in with email                                 |

---

## Tech Stack

| Layer           | Technology                   |
| --------------- | ---------------------------- |
| Framework       | Next.js 16 (App Router)      |
| Styling         | Tailwind CSS + shadcn/ui     |
| Drag & Drop     | @dnd-kit                     |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| Deployment      | Vercel                       |

---

## Local Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/neeleshgadi/chess-predictor.git
   cd chess-predictor
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create `.env.local`** in the root with your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
   SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
   ```

4. **Run the database schema** — open the Supabase SQL Editor and run the contents of `supabase/schema.sql`.

5. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable                        | Required | Description                                                       |
| ------------------------------- | -------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅       | Your Supabase project URL                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅       | Supabase anon/public key                                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | ✅       | Supabase service role key (server-side only)                      |
| `CRON_SECRET`                   | ✅       | Secret token to authenticate cron job requests                    |
| `TOURNAMENT_ID`                 | ✅       | The active tournament ID to poll standings for                    |
| `EXTERNAL_API_SOURCE`           | ✅       | `lichess` or `chessdotcom`                                        |
| `EXTERNAL_API_BASE_URL`         | ✅       | Base URL of the chess API endpoint                                |
| `NEXT_PUBLIC_APP_URL`           | ✅       | Your deployed app URL (e.g. `https://chess-predictor.vercel.app`) |
