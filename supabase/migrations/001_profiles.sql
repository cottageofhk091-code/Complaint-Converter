-- Smartお詫びコンシェルジュ / 中央ダッシュボード連携用
-- Supabase SQL Editor で実行してください。

-- 会員プロファイル（登録時アンケート＋無料/有料フラグ）
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  app_name text not null default 'apology',
  email text,
  display_name text,
  age_group text not null,
  region text not null,
  membership_type text not null default 'free'
    check (membership_type in ('free', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_app_name_idx on public.profiles (app_name);
create index if not exists profiles_membership_type_idx
  on public.profiles (membership_type);
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

alter table public.profiles enable row level security;

-- 本人のみ参照・更新・挿入可
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 任意: Auth ユーザー作成時に空プロファイルを用意する場合のトリガー例
-- （アンケート必須のため、本アプリでは signUp 後にクライアントから upsert します）

comment on table public.profiles is
  'Smartお詫びコンシェルジュ会員。age_group/region/membership_type は管理ダッシュボード集計用。';
