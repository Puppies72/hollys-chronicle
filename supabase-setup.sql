-- Run in Supabase SQL Editor. One private campaign save per authenticated user.
create table if not exists public.chronicle_saves (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 1 check (revision >= 1),
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.chronicle_saves enable row level security;
create policy "Owner may read own save" on public.chronicle_saves for select to authenticated using (auth.uid() = user_id);
create policy "Owner may create own save" on public.chronicle_saves for insert to authenticated with check (auth.uid() = user_id);
create policy "Owner may update own save" on public.chronicle_saves for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- No anonymous or cross-user access is granted by these policies.
