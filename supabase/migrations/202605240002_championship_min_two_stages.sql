-- Ranking de campeonato: exigir pelo menos 2 etapas com nota

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
    sum(scored.stage_points) as total_score,
    count(*) as stages_count
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
    or (public.is_judge() and ev.status = 'active')
    or ev.status = 'published'
  );

grant select on public.championship_ranking to anon, authenticated;
