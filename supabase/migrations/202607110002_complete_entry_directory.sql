-- Cadastro completo de inscricoes mantendo competidores, cavalos e inscricoes normalizados.

create index if not exists idx_competitors_name_normalized
  on public.competitors (lower(trim(name)));

create index if not exists idx_competitors_document
  on public.competitors (document)
  where document is not null and trim(document) <> '';

create index if not exists idx_horses_name_normalized
  on public.horses (lower(trim(name)));

create index if not exists idx_horses_registration
  on public.horses (registration)
  where registration is not null and trim(registration) <> '';

create or replace function public.find_or_create_competitor(
  p_name text,
  p_document text default null,
  p_city text default null,
  p_uf text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_document text := nullif(trim(coalesce(p_document, '')), '');
  v_city text := nullif(trim(coalesce(p_city, '')), '');
  v_uf text := upper(nullif(trim(coalesce(p_uf, '')), ''));
  v_name_key text;
  v_document_key text;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem cadastrar competidores.' using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'Nome do competidor e obrigatorio.';
  end if;

  v_name_key := lower(regexp_replace(v_name, '\s+', ' ', 'g'));
  v_document_key := lower(regexp_replace(coalesce(v_document, ''), '[^a-zA-Z0-9]', '', 'g'));

  perform pg_advisory_xact_lock(
    hashtextextended('competitor:' || coalesce(nullif(v_document_key, ''), v_name_key), 0)
  );

  if v_document_key <> '' then
    select id into v_id
    from public.competitors
    where lower(regexp_replace(coalesce(document, ''), '[^a-zA-Z0-9]', '', 'g')) = v_document_key
    order by created_at
    limit 1;
  end if;

  if v_id is null then
    select id into v_id
    from public.competitors
    where lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = v_name_key
      and (v_city is null or city is null or lower(trim(city)) = lower(v_city))
      and (v_uf is null or uf is null or upper(trim(uf)) = v_uf)
    order by
      case when v_city is not null and lower(trim(coalesce(city, ''))) = lower(v_city) then 0 else 1 end,
      case when v_uf is not null and upper(trim(coalesce(uf, ''))) = v_uf then 0 else 1 end,
      created_at
    limit 1;
  end if;

  if v_id is null then
    insert into public.competitors (name, document, city, uf)
    values (v_name, v_document, v_city, v_uf)
    returning id into v_id;
  else
    update public.competitors
    set
      document = coalesce(nullif(document, ''), v_document),
      city = coalesce(nullif(city, ''), v_city),
      uf = coalesce(nullif(uf, ''), v_uf)
    where id = v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.find_or_create_competitor(text, text, text, text) from public;
grant execute on function public.find_or_create_competitor(text, text, text, text) to authenticated;

create or replace function public.find_or_create_horse(
  p_name text,
  p_registration text default null,
  p_owner text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_registration text := nullif(trim(coalesce(p_registration, '')), '');
  v_owner text := nullif(trim(coalesce(p_owner, '')), '');
  v_name_key text;
  v_registration_key text;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem cadastrar cavalos.' using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'Nome do cavalo e obrigatorio.';
  end if;

  v_name_key := lower(regexp_replace(v_name, '\s+', ' ', 'g'));
  v_registration_key := lower(regexp_replace(coalesce(v_registration, ''), '[^a-zA-Z0-9]', '', 'g'));

  perform pg_advisory_xact_lock(
    hashtextextended('horse:' || coalesce(nullif(v_registration_key, ''), v_name_key), 0)
  );

  if v_registration_key <> '' then
    select id into v_id
    from public.horses
    where lower(regexp_replace(coalesce(registration, ''), '[^a-zA-Z0-9]', '', 'g')) = v_registration_key
    order by created_at
    limit 1;
  end if;

  if v_id is null then
    select id into v_id
    from public.horses
    where lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = v_name_key
      and (v_owner is null or owner is null or lower(trim(owner)) = lower(v_owner))
    order by
      case when v_owner is not null and lower(trim(coalesce(owner, ''))) = lower(v_owner) then 0 else 1 end,
      created_at
    limit 1;
  end if;

  if v_id is null then
    insert into public.horses (name, registration, owner)
    values (v_name, v_registration, v_owner)
    returning id into v_id;
  else
    update public.horses
    set
      registration = coalesce(nullif(registration, ''), v_registration),
      owner = coalesce(nullif(owner, ''), v_owner)
    where id = v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.find_or_create_horse(text, text, text) from public;
grant execute on function public.find_or_create_horse(text, text, text) to authenticated;

create or replace view public.complete_entries
with (security_invoker = true)
as
select
  e.id as entry_id,
  e.event_id,
  e.stage,
  e.draw_order,
  e.entry_number,
  e.status,
  e.category_id,
  c.name as category_name,
  e.level,
  e.competitor_id,
  comp.name as competitor_name,
  comp.document as competitor_document,
  comp.city,
  comp.uf,
  e.horse_id,
  h.name as horse_name,
  h.registration as horse_registration,
  h.owner as horse_owner,
  e.created_at,
  e.updated_at
from public.entries e
join public.categories c on c.id = e.category_id
join public.competitors comp on comp.id = e.competitor_id
join public.horses h on h.id = e.horse_id;

grant select on public.complete_entries to authenticated;

