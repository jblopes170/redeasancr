-- Eventos ao vivo, finalizados e publicados ficam visiveis no portal e ranking.

drop policy if exists events_select_by_visibility on public.events;
create policy events_select_by_visibility
on public.events
for select
to anon, authenticated
using (
  public.is_admin()
  or public.is_judge()
  or status in ('active', 'finished', 'published')
);

drop policy if exists categories_select_published_event on public.categories;
create policy categories_select_published_event
on public.categories
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.events e
    where e.id = categories.event_id
      and e.status in ('active', 'finished', 'published')
  )
);

drop policy if exists registration_requests_insert_own on public.registration_requests;
create policy registration_requests_insert_own
on public.registration_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_id
      and e.status in ('active', 'published')
  )
);

drop view if exists public.ranking_by_stage;
create view public.ranking_by_stage as
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
    e.event_id, e.category_id, c.name, e.level, s.stage,
    e.competitor_id, comp.name, e.horse_id, h.name
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
  or public.is_judge()
  or ev.status in ('active', 'finished', 'published');

drop view if exists public.championship_ranking;
create view public.championship_ranking as
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
    e.event_id, e.category_id, c.name, e.level, s.stage,
    e.competitor_id, comp.name, e.horse_id, h.name
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
    sum(scored.stage_points) as total_score,
    count(*) as stages_count
  from scored
  group by
    scored.event_id, scored.category_id, scored.category_name, scored.level,
    scored.competitor_id, scored.competitor_name, scored.horse_id, scored.horse_name
)
select
  base.event_id,
  base.category_id,
  base.category_name,
  base.level,
  base.competitor_id,
  base.competitor_name,
  base.horse_id,
  base.horse_name,
  base.stage_1_score,
  base.stage_2_score,
  base.stage_3_score,
  base.total_score,
  row_number() over (
    partition by base.event_id, base.category_id, base.level
    order by base.total_score desc, base.competitor_name asc
  ) as position
from base
join public.events ev on ev.id = base.event_id
where
  base.stages_count >= 2
  and (
    public.is_admin()
    or public.is_judge()
    or ev.status in ('active', 'finished', 'published')
  );

grant select on public.ranking_by_stage to anon, authenticated;
grant select on public.championship_ranking to anon, authenticated;
