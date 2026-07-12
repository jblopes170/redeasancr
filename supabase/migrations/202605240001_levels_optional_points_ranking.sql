-- Atualizacao NTMR: categorias sem nivel e ranking por pontos de colocacao

-- 1) Categories: nivel opcional (N1..N4 apenas quando informado)
alter table if exists public.categories
  drop constraint if exists categories_unique_event_name_level;

alter table if exists public.categories
  drop constraint if exists categories_level_check;

alter table if exists public.categories
  alter column level drop not null;

alter table if exists public.categories
  add constraint categories_level_check check (level is null or level in ('N1', 'N2', 'N3', 'N4'));

create unique index if not exists idx_categories_unique_event_name_level_nullable
  on public.categories (event_id, lower(name), coalesce(level, '__SEM_NIVEL__'));

-- 2) Entries: nivel opcional e unicidade considerando null
alter table if exists public.entries
  drop constraint if exists entries_unique_exact;

alter table if exists public.entries
  drop constraint if exists entries_level_check;

alter table if exists public.entries
  alter column level drop not null;

alter table if exists public.entries
  add constraint entries_level_check check (level is null or level in ('N1', 'N2', 'N3', 'N4'));

create unique index if not exists idx_entries_unique_exact_nullable
  on public.entries (
    event_id,
    competitor_id,
    horse_id,
    category_id,
    coalesce(level, '__SEM_NIVEL__'),
    stage
  );

-- 3) Ranking por etapa: nota final e pontos da etapa (25,18,15,12,10,8,6,4,2,1)
create or replace view public.ranking_by_stage as
with stage_totals as (
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
),
ranked as (
  select
    stage_totals.*,
    row_number() over (
      partition by stage_totals.event_id, stage_totals.category_id, stage_totals.level, stage_totals.stage
      order by stage_totals.total_score desc, stage_totals.competitor_name asc
    ) as position
  from stage_totals
)
select
  ranked.event_id,
  ranked.category_id,
  ranked.category_name,
  ranked.level,
  ranked.stage,
  ranked.competitor_id,
  ranked.competitor_name,
  ranked.horse_id,
  ranked.horse_name,
  ranked.total_score,
  case ranked.position
    when 1 then 25
    when 2 then 18
    when 3 then 15
    when 4 then 12
    when 5 then 10
    when 6 then 8
    when 7 then 6
    when 8 then 4
    when 9 then 2
    when 10 then 1
    else 0
  end as stage_points,
  ranked.position
from ranked
join public.events ev on ev.id = ranked.event_id
where
  public.is_admin()
  or (public.is_judge() and ev.status = 'active')
  or ev.status = 'published';

-- 4) Ranking campeonato: soma de pontos das 3 etapas
create or replace view public.championship_ranking as
with stage_totals as (
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
),
stage_ranked as (
  select
    stage_totals.*,
    row_number() over (
      partition by stage_totals.event_id, stage_totals.category_id, stage_totals.level, stage_totals.stage
      order by stage_totals.total_score desc, stage_totals.competitor_name asc
    ) as stage_position
  from stage_totals
),
scored as (
  select
    stage_ranked.*,
    case stage_ranked.stage_position
      when 1 then 25
      when 2 then 18
      when 3 then 15
      when 4 then 12
      when 5 then 10
      when 6 then 8
      when 7 then 6
      when 8 then 4
      when 9 then 2
      when 10 then 1
      else 0
    end as stage_points
  from stage_ranked
),
base as (
  select
    scored.event_id,
    scored.category_id,
    scored.category_name,
    scored.level,
    scored.competitor_id,
    scored.competitor_name,
    scored.horse_id,
    scored.horse_name,
    sum(case when scored.stage = 1 then scored.stage_points else 0 end) as stage_1_score,
    sum(case when scored.stage = 2 then scored.stage_points else 0 end) as stage_2_score,
    sum(case when scored.stage = 3 then scored.stage_points else 0 end) as stage_3_score,
    sum(scored.stage_points) as total_score
  from scored
  group by
    scored.event_id,
    scored.category_id,
    scored.category_name,
    scored.level,
    scored.competitor_id,
    scored.competitor_name,
    scored.horse_id,
    scored.horse_name
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
