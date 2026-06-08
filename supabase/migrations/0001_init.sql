-- ════════════════════════════════════════════════════════════════════════
-- トークスクリプト評価ツール — 初期スキーマ
--   * マルチテナント（tenant_id で分離）
--   * 全テーブル RLS 有効
--   * staff は自分のレコードのみ、admin は同一テナント全体を閲覧
--   * scripts の編集は admin のみ
--   * recordings は長尺対応のため recording_segments に分割保存できる
-- 適用: Supabase SQL Editor で本ファイルを実行、または supabase db push。
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────────────
-- テーブル
-- ────────────────────────────────────────────────────────────────────────

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete cascade,
  store_id uuid references public.stores (id) on delete set null,
  display_name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null,
  category text not null default 'other'
    check (category in ('counseling', 'closing', 'objection', 'other')),
  body text not null default '',
  required_keywords jsonb not null default '[]'::jsonb,
  rubric jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  store_id uuid references public.stores (id) on delete set null,
  staff_id uuid not null references public.profiles (id) on delete cascade,
  script_id uuid not null references public.scripts (id) on delete restrict,
  audio_path text,
  duration_sec int,
  transcript text,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'transcribing', 'transcribed', 'evaluating', 'evaluated', 'error')),
  error_message text,
  created_at timestamptz not null default now()
);

-- 長尺録音をセグメント分割して保存（25MB 上限回避＋逐次文字起こし）。
create table if not exists public.recording_segments (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  seq int not null,
  audio_path text not null,
  duration_sec int,
  transcript text,
  status text not null default 'pending'
    check (status in ('pending', 'transcribed', 'error')),
  error_message text,
  created_at timestamptz not null default now(),
  unique (recording_id, seq)
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.recordings (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  total_score numeric(5, 1) not null default 0,
  keyword_coverage numeric(5, 1) not null default 0,
  flow_score numeric(5, 1) not null default 0,
  tone_score numeric(5, 1) not null default 0,
  scores_detail jsonb not null default '{}'::jsonb,
  keyword_hits jsonb not null default '[]'::jsonb,
  keyword_misses jsonb not null default '[]'::jsonb,
  feedback text not null default '',
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  model text not null default '',
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────
-- インデックス
-- ────────────────────────────────────────────────────────────────────────
create index if not exists idx_stores_tenant on public.stores (tenant_id);
create index if not exists idx_profiles_tenant on public.profiles (tenant_id);
create index if not exists idx_scripts_tenant on public.scripts (tenant_id);
create index if not exists idx_recordings_tenant_created on public.recordings (tenant_id, created_at desc);
create index if not exists idx_recordings_staff on public.recordings (staff_id);
create index if not exists idx_recordings_script on public.recordings (script_id);
create index if not exists idx_segments_recording on public.recording_segments (recording_id, seq);
create index if not exists idx_evaluations_recording on public.evaluations (recording_id, created_at desc);
create index if not exists idx_evaluations_tenant on public.evaluations (tenant_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────
-- RLS 用ヘルパー（SECURITY DEFINER で profiles を参照し、ポリシーの再帰を回避）
-- ────────────────────────────────────────────────────────────────────────

create or replace function public.auth_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- updated_at 自動更新
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_scripts_updated_at on public.scripts;
create trigger trg_scripts_updated_at
  before update on public.scripts
  for each row execute function public.touch_updated_at();

-- 新規 auth ユーザー作成時に profiles を自動生成。
-- 招待時の user_metadata（tenant_id / store_id / display_name / role）を引き継ぐ。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, tenant_id, store_id, display_name, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'tenant_id', '')::uuid,
    nullif(new.raw_user_meta_data ->> 'store_id', '')::uuid,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'staff')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────
-- RLS 有効化
-- ────────────────────────────────────────────────────────────────────────
alter table public.tenants enable row level security;
alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.scripts enable row level security;
alter table public.recordings enable row level security;
alter table public.recording_segments enable row level security;
alter table public.evaluations enable row level security;

-- tenants: 自テナントのみ閲覧。書き込みは service role に限定。
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
  for select using (id = public.auth_tenant_id());

-- stores: 自テナント閲覧、admin が書き込み。
drop policy if exists stores_select on public.stores;
create policy stores_select on public.stores
  for select using (tenant_id = public.auth_tenant_id());

drop policy if exists stores_write on public.stores;
create policy stores_write on public.stores
  for all
  using (public.is_admin() and tenant_id = public.auth_tenant_id())
  with check (public.is_admin() and tenant_id = public.auth_tenant_id());

-- profiles: 自分は常に閲覧/更新可。admin は同一テナント全体を閲覧/更新/追加可。
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or (public.is_admin() and tenant_id = public.auth_tenant_id())
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update
  using (public.is_admin() and tenant_id = public.auth_tenant_id())
  with check (public.is_admin() and tenant_id = public.auth_tenant_id());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert
  with check (public.is_admin() and tenant_id = public.auth_tenant_id());

-- scripts: 自テナント閲覧、admin が CRUD。
drop policy if exists scripts_select on public.scripts;
create policy scripts_select on public.scripts
  for select using (tenant_id = public.auth_tenant_id());

drop policy if exists scripts_write on public.scripts;
create policy scripts_write on public.scripts
  for all
  using (public.is_admin() and tenant_id = public.auth_tenant_id())
  with check (public.is_admin() and tenant_id = public.auth_tenant_id());

-- recordings: admin は自テナント全件、staff は自分の録音のみ。
drop policy if exists recordings_select on public.recordings;
create policy recordings_select on public.recordings
  for select using (
    tenant_id = public.auth_tenant_id()
    and (public.is_admin() or staff_id = auth.uid())
  );

drop policy if exists recordings_insert on public.recordings;
create policy recordings_insert on public.recordings
  for insert
  with check (tenant_id = public.auth_tenant_id() and staff_id = auth.uid());

drop policy if exists recordings_update on public.recordings;
create policy recordings_update on public.recordings
  for update
  using (
    tenant_id = public.auth_tenant_id()
    and (public.is_admin() or staff_id = auth.uid())
  )
  with check (
    tenant_id = public.auth_tenant_id()
    and (public.is_admin() or staff_id = auth.uid())
  );

drop policy if exists recordings_delete on public.recordings;
create policy recordings_delete on public.recordings
  for delete using (
    tenant_id = public.auth_tenant_id()
    and (public.is_admin() or staff_id = auth.uid())
  );

-- recording_segments: 紐づく recording の所有権で判定。
drop policy if exists segments_select on public.recording_segments;
create policy segments_select on public.recording_segments
  for select using (
    tenant_id = public.auth_tenant_id()
    and (
      public.is_admin()
      or exists (
        select 1 from public.recordings r
        where r.id = recording_id and r.staff_id = auth.uid()
      )
    )
  );

drop policy if exists segments_insert on public.recording_segments;
create policy segments_insert on public.recording_segments
  for insert
  with check (
    tenant_id = public.auth_tenant_id()
    and exists (
      select 1 from public.recordings r
      where r.id = recording_id and r.staff_id = auth.uid()
    )
  );

drop policy if exists segments_update on public.recording_segments;
create policy segments_update on public.recording_segments
  for update
  using (
    tenant_id = public.auth_tenant_id()
    and (
      public.is_admin()
      or exists (
        select 1 from public.recordings r
        where r.id = recording_id and r.staff_id = auth.uid()
      )
    )
  )
  with check (tenant_id = public.auth_tenant_id());

-- evaluations: admin は自テナント全件、staff は自分の録音の評価のみ。
-- 作成・更新は基本 service role（評価 API）が行うため、admin のみ書き込み許可。
drop policy if exists evaluations_select on public.evaluations;
create policy evaluations_select on public.evaluations
  for select using (
    tenant_id = public.auth_tenant_id()
    and (
      public.is_admin()
      or exists (
        select 1 from public.recordings r
        where r.id = recording_id and r.staff_id = auth.uid()
      )
    )
  );

drop policy if exists evaluations_write_admin on public.evaluations;
create policy evaluations_write_admin on public.evaluations
  for all
  using (public.is_admin() and tenant_id = public.auth_tenant_id())
  with check (public.is_admin() and tenant_id = public.auth_tenant_id());

-- ════════════════════════════════════════════════════════════════════════
-- Storage: 非公開バケット recordings。パスは {tenant_id}/{recording_id}/{seq}.webm
--   先頭フォルダ = tenant_id で分離。読み取りは署名付き URL（サーバー生成）が基本。
-- ════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

drop policy if exists recordings_storage_insert on storage.objects;
create policy recordings_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
  );

drop policy if exists recordings_storage_select on storage.objects;
create policy recordings_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
  );

drop policy if exists recordings_storage_delete on storage.objects;
create policy recordings_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'recordings'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
    and public.is_admin()
  );
