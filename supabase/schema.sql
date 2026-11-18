-- DuoDev: progresso de cada usuário (rode uma vez no SQL Editor do Supabase).
create table public.progress (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;
create policy "dono lê e grava o próprio progresso" on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
