-- Atualizacao do portal NTMR.
-- Execute este arquivo apenas depois das migrations 001, ranking, acessos e cadastro completo.

-- Fluxo de usuarios, solicitacoes de inscricao, sugestoes e publicacoes.

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  summary text,
  content text not null,
  post_type text not null default 'news',
  status text not null default 'draft',
  featured boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_posts_type_check check (post_type in ('news', 'event_update')),
  constraint news_posts_status_check check (status in ('draft', 'published'))
);

create table if not exists public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  stages smallint[] not null default array[1]::smallint[],
  competitor_name text not null,
  competitor_document text,
  competitor_city text,
  competitor_uf text,
  horse_name text not null,
  horse_registration text,
  horse_owner text,
  notes text,
  status text not null default 'pending',
  admin_notes text,
  entry_ids uuid[] not null default '{}'::uuid[],
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registration_requests_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  constraint registration_requests_stages_check check (
    cardinality(stages) > 0 and stages <@ array[1, 2, 3]::smallint[]
  )
);

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  event_id uuid references public.events(id) on delete set null,
  subject text not null,
  message text not null,
  status text not null default 'new',
  response text,
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suggestions_status_check check (status in ('new', 'read', 'answered', 'archived'))
);

create index if not exists idx_news_posts_status_published on public.news_posts(status, published_at desc);
create index if not exists idx_news_posts_event on public.news_posts(event_id);
create index if not exists idx_registration_requests_user on public.registration_requests(user_id, created_at desc);
create index if not exists idx_registration_requests_status on public.registration_requests(status, created_at);
create index if not exists idx_suggestions_user on public.suggestions(user_id, created_at desc);
create index if not exists idx_suggestions_status on public.suggestions(status, created_at);

drop trigger if exists trg_news_posts_updated_at on public.news_posts;
create trigger trg_news_posts_updated_at before update on public.news_posts
for each row execute function public.set_updated_at();

drop trigger if exists trg_registration_requests_updated_at on public.registration_requests;
create trigger trg_registration_requests_updated_at before update on public.registration_requests
for each row execute function public.set_updated_at();

drop trigger if exists trg_suggestions_updated_at on public.suggestions;
create trigger trg_suggestions_updated_at before update on public.suggestions
for each row execute function public.set_updated_at();

alter table public.news_posts enable row level security;
alter table public.registration_requests enable row level security;
alter table public.suggestions enable row level security;

drop policy if exists news_posts_public_read on public.news_posts;
create policy news_posts_public_read on public.news_posts
for select to anon, authenticated
using (status = 'published' and coalesce(published_at, now()) <= now());

drop policy if exists news_posts_admin_all on public.news_posts;
create policy news_posts_admin_all on public.news_posts
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists registration_requests_select_own on public.registration_requests;
create policy registration_requests_select_own on public.registration_requests
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists registration_requests_insert_own on public.registration_requests;
create policy registration_requests_insert_own on public.registration_requests
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.events e
    where e.id = event_id and e.status = 'published'
  )
);

drop policy if exists registration_requests_update_own_pending on public.registration_requests;
create policy registration_requests_update_own_pending on public.registration_requests
for update to authenticated
using (user_id = auth.uid() and status = 'pending')
with check (user_id = auth.uid() and status in ('pending', 'cancelled'));

drop policy if exists registration_requests_admin_all on public.registration_requests;
create policy registration_requests_admin_all on public.registration_requests
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists suggestions_select_own on public.suggestions;
create policy suggestions_select_own on public.suggestions
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists suggestions_insert_own on public.suggestions;
create policy suggestions_insert_own on public.suggestions
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists suggestions_admin_all on public.suggestions;
create policy suggestions_admin_all on public.suggestions
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists categories_select_published_event on public.categories;
create policy categories_select_published_event on public.categories
for select to anon, authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = categories.event_id and e.status = 'published'
  )
);

grant select on public.news_posts to anon, authenticated;
grant insert, update, delete on public.news_posts to authenticated;
grant select, insert, update on public.registration_requests to authenticated;
grant select, insert, update on public.suggestions to authenticated;

create or replace function public.approve_registration_request(p_request_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.registration_requests%rowtype;
  category_level text;
  competitor_id_value uuid;
  horse_id_value uuid;
  stage_value smallint;
  entry_id_value uuid;
  result_ids uuid[] := '{}'::uuid[];
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem aprovar inscricoes.' using errcode = '42501';
  end if;

  select * into request_row
  from public.registration_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitacao de inscricao nao encontrada.';
  end if;

  if request_row.status = 'approved' then
    return request_row.entry_ids;
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Somente solicitacoes pendentes podem ser aprovadas.';
  end if;

  select level into category_level
  from public.categories
  where id = request_row.category_id and event_id = request_row.event_id;

  if not found then
    raise exception 'Categoria invalida para o evento.';
  end if;

  competitor_id_value := public.find_or_create_competitor(
    request_row.competitor_name,
    request_row.competitor_document,
    request_row.competitor_city,
    request_row.competitor_uf
  );

  horse_id_value := public.find_or_create_horse(
    request_row.horse_name,
    request_row.horse_registration,
    request_row.horse_owner
  );

  foreach stage_value in array request_row.stages loop
    begin
      insert into public.entries (
        event_id, competitor_id, horse_id, category_id, level, stage, status
      ) values (
        request_row.event_id,
        competitor_id_value,
        horse_id_value,
        request_row.category_id,
        category_level,
        stage_value,
        'registered'
      )
      returning id into entry_id_value;
    exception when unique_violation then
      select id into entry_id_value
      from public.entries
      where event_id = request_row.event_id
        and competitor_id = competitor_id_value
        and horse_id = horse_id_value
        and category_id = request_row.category_id
        and stage = stage_value
        and level is not distinct from category_level
      limit 1;
    end;

    if entry_id_value is not null and not (entry_id_value = any(result_ids)) then
      result_ids := array_append(result_ids, entry_id_value);
    end if;
  end loop;

  update public.registration_requests
  set
    status = 'approved',
    entry_ids = result_ids,
    approved_by = auth.uid(),
    approved_at = now(),
    updated_at = now()
  where id = p_request_id;

  return result_ids;
end;
$$;

revoke all on function public.approve_registration_request(uuid) from public;
grant execute on function public.approve_registration_request(uuid) to authenticated;



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
