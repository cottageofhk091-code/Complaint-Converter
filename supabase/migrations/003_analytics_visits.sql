-- analytics_visits: アクセス流入元（UTM / referrer）の記録
create table if not exists public.analytics_visits (
  id uuid primary key default gen_random_uuid(),
  app_name text not null,
  source_category text not null,
  utm_source text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_visits_app_name_created_at_idx
  on public.analytics_visits (app_name, created_at desc);

create index if not exists analytics_visits_source_category_idx
  on public.analytics_visits (source_category);

alter table public.analytics_visits enable row level security;

-- 公開サイトからの insert（anon / authenticated）を許可
drop policy if exists "analytics_visits_insert_anon" on public.analytics_visits;
create policy "analytics_visits_insert_anon"
  on public.analytics_visits
  for insert
  to anon, authenticated
  with check (true);

-- 読み取りはサービスロール等の管理用途向け（anon には公開しない）
drop policy if exists "analytics_visits_select_authenticated" on public.analytics_visits;
create policy "analytics_visits_select_authenticated"
  on public.analytics_visits
  for select
  to authenticated
  using (true);
