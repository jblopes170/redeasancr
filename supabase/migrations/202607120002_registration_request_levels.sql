-- Niveis separados em solicitacoes de inscricao.
-- Uma solicitacao pode selecionar N1, N2, N3 e/ou N4 para a mesma passada.

alter table public.registration_requests
add column if not exists requested_levels text[];

alter table public.registration_requests
drop constraint if exists registration_requests_requested_levels_check;

alter table public.registration_requests
add constraint registration_requests_requested_levels_check
check (
  requested_levels is null
  or (
    cardinality(requested_levels) > 0
    and requested_levels <@ array['N1', 'N2', 'N3', 'N4']::text[]
  )
);

create or replace function public.approve_registration_request(p_request_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.registration_requests%rowtype;
  category_row record;
  category_to_create record;
  category_is_leveled boolean;
  levels_to_create text[];
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

  select id, name, level into category_row
  from public.categories
  where id = request_row.category_id and event_id = request_row.event_id;

  if not found then
    raise exception 'Categoria invalida para o evento.';
  end if;

  select exists (
    select 1
    from public.categories c
    where c.event_id = request_row.event_id
      and lower(trim(c.name)) = lower(trim(category_row.name))
      and c.level is not null
  ) into category_is_leveled;

  if category_is_leveled then
    if coalesce(cardinality(request_row.requested_levels), 0) > 0 then
      levels_to_create := request_row.requested_levels;
    elsif category_row.level is not null then
      levels_to_create := array[category_row.level]::text[];
    else
      raise exception 'Selecione ao menos um nivel para esta categoria.';
    end if;
  else
    levels_to_create := array[coalesce(category_row.level, '__SEM_NIVEL__')]::text[];
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

  for category_to_create in
    select c.id, c.level
    from public.categories c
    where c.event_id = request_row.event_id
      and (
        (category_is_leveled and lower(trim(c.name)) = lower(trim(category_row.name)) and c.level = any(levels_to_create))
        or
        (not category_is_leveled and c.id = request_row.category_id)
      )
    order by array_position(array['N1', 'N2', 'N3', 'N4']::text[], c.level)
  loop
    foreach stage_value in array request_row.stages loop
      begin
        insert into public.entries (
          event_id, competitor_id, horse_id, category_id, level, stage, status
        ) values (
          request_row.event_id,
          competitor_id_value,
          horse_id_value,
          category_to_create.id,
          category_to_create.level,
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
          and category_id = category_to_create.id
          and stage = stage_value
          and level is not distinct from category_to_create.level
        limit 1;
      end;

      if entry_id_value is not null and not (entry_id_value = any(result_ids)) then
        result_ids := array_append(result_ids, entry_id_value);
      end if;
    end loop;
  end loop;

  if cardinality(result_ids) = 0 then
    raise exception 'Nenhuma inscricao foi criada. Verifique os niveis da categoria.';
  end if;

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
