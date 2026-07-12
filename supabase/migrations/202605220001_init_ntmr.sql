-- Projeto NTMR Ranking - estrutura inicial
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'user',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'judge', 'user'))
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  starts_on date,
  ends_on date,
  prize_pool numeric not null default 0,
  status text not null default 'draft',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_status_check check (status in ('draft', 'active', 'finished', 'published')),
  constraint events_date_check check (starts_on is null or ends_on is null or starts_on <= ends_on)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  level text not null,
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint categories_level_check check (level in ('N1', 'N2', 'N3', 'N4')),
  constraint categories_unique_event_name_level unique (event_id, name, level)
);

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  phone text,
  email text,
  city text,
  uf text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.horses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration text,
  owner text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  competitor_id uuid not null references public.competitors(id),
  horse_id uuid not null references public.horses(id),
  category_id uuid not null references public.categories(id),
  level text not null,
  stage int not null,
  entry_number text,
  draw_order int,
  status text not null default 'registered',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entries_level_check check (level in ('N1', 'N2', 'N3', 'N4')),
  constraint entries_stage_check check (stage in (1, 2, 3)),
  constraint entries_status_check check (status in ('registered', 'cancelled', 'finished')),
  constraint entries_unique_exact unique (event_id, competitor_id, horse_id, category_id, level, stage)
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  entry_id uuid not null references public.entries(id) on delete cascade,
  judge_id uuid not null references public.profiles(id),
  stage int not null,
  score numeric not null,
  penalties numeric not null default 0,
  final_score numeric generated always as (score - penalties) stored,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scores_stage_check check (stage in (1, 2, 3)),
  constraint scores_unique_entry_judge_stage unique (entry_id, judge_id, stage)
);

create index if not exists idx_events_status on public.events(status);
create index if not exists idx_categories_event_level on public.categories(event_id, level);
create index if not exists idx_entries_event_category_level_stage on public.entries(event_id, category_id, level, stage);
create index if not exists idx_scores_event_stage on public.scores(event_id, stage);
create index if not exists idx_scores_entry_id on public.scores(entry_id);
create index if not exists idx_profiles_role on public.profiles(role);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger trg_competitors_updated_at
before update on public.competitors
for each row execute function public.set_updated_at();

create trigger trg_horses_updated_at
before update on public.horses
for each row execute function public.set_updated_at();

create trigger trg_entries_updated_at
before update on public.entries
for each row execute function public.set_updated_at();

create trigger trg_scores_updated_at
before update on public.scores
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p.active = true
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.is_judge()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'judge', false);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, active)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', null),
    'user',
    true
  )
  on conflict (id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace view public.ranking_by_stage as
with ranked as (
  select
    e.event_id,
    e.category_id,
    c.name as category_name,
    e.level,
    s.stage,
    e.competitor_id,
    comp.name as competitor_name,
    e.horse_id,
    h.name as horse_name,
    sum(s.final_score) as total_score
  from public.scores s
  join public.entries e on e.id = s.entry_id
  join public.categories c on c.id = e.category_id
  join public.competitors comp on comp.id = e.competitor_id
  join public.horses h on h.id = e.horse_id
  where e.status <> 'cancelled'
  group by
    e.event_id,
    e.category_id,
    c.name,
    e.level,
    s.stage,
    e.competitor_id,
    comp.name,
    e.horse_id,
    h.name
)
select
  ranked.*,
  row_number() over (
    partition by ranked.event_id, ranked.category_id, ranked.level, ranked.stage
    order by ranked.total_score desc, ranked.competitor_name asc
  ) as position
from ranked
join public.events ev on ev.id = ranked.event_id
where
  public.is_admin()
  or (public.is_judge() and ev.status = 'active')
  or ev.status = 'published';

create or replace view public.championship_ranking as
with base as (
  select
    e.event_id,
    e.category_id,
    c.name as category_name,
    e.level,
    e.competitor_id,
    comp.name as competitor_name,
    e.horse_id,
    h.name as horse_name,
    sum(case when s.stage = 1 then s.final_score else 0 end) as stage_1_score,
    sum(case when s.stage = 2 then s.final_score else 0 end) as stage_2_score,
    sum(case when s.stage = 3 then s.final_score else 0 end) as stage_3_score,
    sum(s.final_score) as total_score
  from public.scores s
  join public.entries e on e.id = s.entry_id
  join public.categories c on c.id = e.category_id
  join public.competitors comp on comp.id = e.competitor_id
  join public.horses h on h.id = e.horse_id
  where e.status <> 'cancelled'
  group by
    e.event_id,
    e.category_id,
    c.name,
    e.level,
    e.competitor_id,
    comp.name,
    e.horse_id,
    h.name
)
select
  base.*,
  row_number() over (
    partition by base.event_id, base.category_id, base.level
    order by base.total_score desc, base.competitor_name asc
  ) as position
from base
join public.events ev on ev.id = base.event_id
where
  public.is_admin()
  or (public.is_judge() and ev.status = 'active')
  or ev.status = 'published';

grant select on public.ranking_by_stage to anon, authenticated;
grant select on public.championship_ranking to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.categories enable row level security;
alter table public.competitors enable row level security;
alter table public.horses enable row level security;
alter table public.entries enable row level security;
alter table public.scores enable row level security;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin());

create policy profiles_insert_own_or_admin
on public.profiles
for insert
to authenticated
with check (auth.uid() = id or public.is_admin());

create policy profiles_update_admin_only
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy profiles_delete_admin_only
on public.profiles
for delete
to authenticated
using (public.is_admin());

create policy events_select_by_visibility
on public.events
for select
to anon, authenticated
using (
  public.is_admin()
  or (public.is_judge() and status = 'active')
  or status = 'published'
);

create policy events_insert_admin_only
on public.events
for insert
to authenticated
with check (public.is_admin());

create policy events_update_admin_only
on public.events
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy events_delete_admin_only
on public.events
for delete
to authenticated
using (public.is_admin());

create policy categories_select_admin_or_judge
on public.categories
for select
to authenticated
using (
  public.is_admin()
  or (
    public.is_judge()
    and exists (
      select 1 from public.events e
      where e.id = categories.event_id and e.status = 'active'
    )
  )
);

create policy categories_write_admin_only
on public.categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy competitors_select_admin_or_judge
on public.competitors
for select
to authenticated
using (public.is_admin() or public.is_judge());

create policy competitors_write_admin_only
on public.competitors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy horses_select_admin_or_judge
on public.horses
for select
to authenticated
using (public.is_admin() or public.is_judge());

create policy horses_write_admin_only
on public.horses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy entries_select_admin_or_judge_active_event
on public.entries
for select
to authenticated
using (
  public.is_admin()
  or (
    public.is_judge()
    and exists (
      select 1 from public.events e
      where e.id = entries.event_id and e.status = 'active'
    )
  )
);

create policy entries_write_admin_only
on public.entries
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy scores_select_admin_or_judge_active_event
on public.scores
for select
to authenticated
using (
  public.is_admin()
  or (
    public.is_judge()
    and exists (
      select 1 from public.events e
      where e.id = scores.event_id and e.status = 'active'
    )
  )
);

create policy scores_insert_admin_or_judge_active_event
on public.scores
for insert
to authenticated
with check (
  (
    public.is_admin()
  )
  or (
    public.is_judge()
    and judge_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = scores.event_id and e.status = 'active'
    )
  )
);

create policy scores_update_admin_or_own_judge_active_event
on public.scores
for update
to authenticated
using (
  public.is_admin()
  or (
    public.is_judge()
    and judge_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = scores.event_id and e.status = 'active'
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_judge()
    and judge_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = scores.event_id and e.status = 'active'
    )
  )
);

create policy scores_delete_admin_only
on public.scores
for delete
to authenticated
using (public.is_admin());
