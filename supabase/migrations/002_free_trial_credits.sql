-- 初回無料権（有料プラン1回無料）管理カラム
-- Supabase SQL Editor または CLI で適用してください。

alter table public.profiles
  add column if not exists free_trial_credits integer not null default 1;

alter table public.profiles
  add column if not exists free_trial_used boolean not null default false;

-- 既に有料の会員は無料枠を消費済み扱いにする
update public.profiles
set
  free_trial_credits = 0,
  free_trial_used = true
where membership_type = 'paid'
  and (free_trial_credits > 0 or free_trial_used = false);

comment on column public.profiles.free_trial_credits is
  '有料プラン相当のプレミアム生成を無料で使える残り回数（新規登録時 1）';

comment on column public.profiles.free_trial_used is
  '初回無料権を1度でも消費したら true';

-- 認証ユーザー自身のみ、未消費クレジットを原子的に消費する RPC
create or replace function public.consume_free_trial_credit()
returns table (
  success boolean,
  free_trial_credits integer,
  free_trial_used boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_credits integer;
  new_used boolean;
begin
  if uid is null then
    return query select false, 0, true;
    return;
  end if;

  update public.profiles p
  set
    free_trial_credits = 0,
    free_trial_used = true,
    updated_at = now()
  where p.id = uid
    and p.free_trial_credits > 0
  returning p.free_trial_credits, p.free_trial_used
  into new_credits, new_used;

  if found then
    return query select true, coalesce(new_credits, 0), coalesce(new_used, true);
  else
    select p.free_trial_credits, p.free_trial_used
      into new_credits, new_used
    from public.profiles p
    where p.id = uid;

    return query select false, coalesce(new_credits, 0), coalesce(new_used, true);
  end if;
end;
$$;

revoke all on function public.consume_free_trial_credit() from public;
grant execute on function public.consume_free_trial_credit() to authenticated;
