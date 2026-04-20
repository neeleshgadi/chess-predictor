-- Create a table to store user predictions
create table predictions (
  id uuid default gen_random_uuid() primary key,
  user_name text not null, -- The name of the person predicting
  ranked_list jsonb not null, -- The final sorted list of chess players
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Allow anyone to insert a prediction (for our MVP testing)
alter table predictions enable row level security;
create policy "Allow public inserts" on predictions for insert with check (true);
create policy "Allow public read" on predictions for select using (true);