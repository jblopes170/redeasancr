-- Pagamentos, precificacao de inscricoes e DRE automatico.

alter table public.categories
add column if not exists entry_fee numeric(14, 2) not null default 0;

alter table public.entries
add column if not exists entry_fee numeric(14, 2) not null default 0,
add column if not exists payment_status text not null default 'confirmed',
add column if not exists payment_confirmed_at timestamptz;

alter table public.entries
drop constraint if exists entries_payment_status_check;

alter table public.entries
add constraint entries_payment_status_check
check (payment_status in ('pending', 'submitted', 'confirmed', 'rejected', 'waived'));

alter table public.registration_requests
add column if not exists amount_due numeric(14, 2) not null default 0,
add column if not exists payment_status text not null default 'pending',
add column if not exists payment_receipt_url text,
add column if not exists payment_notes text,
add column if not exists payment_confirmed_at timestamptz,
add column if not exists payment_confirmed_by uuid references public.profiles(id) on delete set null;

alter table public.registration_requests
drop constraint if exists registration_requests_payment_status_check;

alter table public.registration_requests
add constraint registration_requests_payment_status_check
check (payment_status in ('pending', 'submitted', 'confirmed', 'rejected', 'waived'));

create index if not exists idx_registration_requests_payment_status
  on public.registration_requests(payment_status, created_at desc);

create index if not exists idx_entries_payment_status
  on public.entries(event_id, payment_status);

create or replace function public.calculate_registration_amount(
  p_event_id uuid,
  p_category_id uuid,
  p_requested_levels text[],
  p_stages smallint[]
)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  category_row record;
  category_is_leveled boolean;
  levels_to_charge text[];
  stage_count int := greatest(coalesce(cardinality(p_stages), 1), 1);
  amount numeric(14, 2) := 0;
begin
  select id, name, level, coalesce(entry_fee, 0) as entry_fee
    into category_row
  from public.categories
  where id = p_category_id and event_id = p_event_id;

  if not found then
    return 0;
  end if;

  select exists (
    select 1
    from public.categories c
    where c.event_id = p_event_id
      and lower(trim(c.name)) = lower(trim(category_row.name))
      and c.level is not null
  ) into category_is_leveled;

  if category_is_leveled then
    if coalesce(cardinality(p_requested_levels), 0) > 0 then
      levels_to_charge := p_requested_levels;
    elsif category_row.level is not null then
      levels_to_charge := array[category_row.level]::text[];
    else
      return 0;
    end if;

    select coalesce(sum(coalesce(c.entry_fee, 0)), 0)
      into amount
    from public.categories c
    where c.event_id = p_event_id
      and lower(trim(c.name)) = lower(trim(category_row.name))
      and c.level = any(levels_to_charge);
  else
    amount := category_row.entry_fee;
  end if;

  return coalesce(amount, 0) * stage_count;
end;
$$;

create or replace function public.set_registration_request_amount()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.amount_due := public.calculate_registration_amount(
    new.event_id,
    new.category_id,
    new.requested_levels,
    new.stages
  );
  return new;
end;
$$;

drop trigger if exists trg_registration_requests_amount on public.registration_requests;
create trigger trg_registration_requests_amount
before insert or update of event_id, category_id, requested_levels, stages
on public.registration_requests
for each row execute function public.set_registration_request_amount();

update public.registration_requests rr
set amount_due = public.calculate_registration_amount(rr.event_id, rr.category_id, rr.requested_levels, rr.stages)
where coalesce(rr.amount_due, 0) = 0;

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
    select c.id, c.level, coalesce(c.entry_fee, 0) as entry_fee
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
          event_id, competitor_id, horse_id, category_id, level, stage, status,
          entry_fee, payment_status, payment_confirmed_at
        ) values (
          request_row.event_id,
          competitor_id_value,
          horse_id_value,
          category_to_create.id,
          category_to_create.level,
          stage_value,
          'registered',
          category_to_create.entry_fee,
          request_row.payment_status,
          request_row.payment_confirmed_at
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

        update public.entries
        set
          entry_fee = category_to_create.entry_fee,
          payment_status = request_row.payment_status,
          payment_confirmed_at = request_row.payment_confirmed_at
        where id = entry_id_value;
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
    amount_due = public.calculate_registration_amount(event_id, category_id, requested_levels, stages),
    entry_ids = result_ids,
    approved_by = auth.uid(),
    approved_at = now(),
    updated_at = now()
  where id = p_request_id;

  return result_ids;
end;
$$;

create or replace function public.submit_registration_payment_receipt(
  p_request_id uuid,
  p_receipt_url text
)
returns public.registration_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.registration_requests%rowtype;
begin
  if nullif(trim(p_receipt_url), '') is null then
    raise exception 'Informe o comprovante de pagamento.';
  end if;

  select * into request_row
  from public.registration_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitacao de inscricao nao encontrada.';
  end if;

  if request_row.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Voce nao pode alterar esta inscricao.' using errcode = '42501';
  end if;

  if request_row.status = 'cancelled' then
    raise exception 'Inscricao cancelada nao aceita comprovante.';
  end if;

  if request_row.payment_status in ('confirmed', 'waived') then
    raise exception 'Pagamento ja confirmado.';
  end if;

  update public.registration_requests
  set
    payment_status = 'submitted',
    payment_receipt_url = trim(p_receipt_url),
    payment_notes = null,
    updated_at = now()
  where id = p_request_id
  returning * into request_row;

  update public.entries
  set payment_status = 'submitted'
  where id = any(request_row.entry_ids);

  return request_row;
end;
$$;

create or replace function public.confirm_registration_payment(
  p_request_id uuid,
  p_payment_notes text default null
)
returns public.registration_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.registration_requests%rowtype;
  amount_value numeric(14, 2);
  tx_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem confirmar pagamentos.' using errcode = '42501';
  end if;

  select * into request_row
  from public.registration_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitacao de inscricao nao encontrada.';
  end if;

  if request_row.status <> 'approved' then
    raise exception 'Aprove a inscricao antes de confirmar o pagamento.';
  end if;

  amount_value := coalesce(nullif(request_row.amount_due, 0), public.calculate_registration_amount(
    request_row.event_id,
    request_row.category_id,
    request_row.requested_levels,
    request_row.stages
  ));

  update public.registration_requests
  set
    amount_due = amount_value,
    payment_status = 'confirmed',
    payment_notes = nullif(trim(coalesce(p_payment_notes, '')), ''),
    payment_confirmed_at = now(),
    payment_confirmed_by = auth.uid(),
    updated_at = now()
  where id = p_request_id
  returning * into request_row;

  update public.entries
  set
    payment_status = 'confirmed',
    payment_confirmed_at = request_row.payment_confirmed_at
  where id = any(request_row.entry_ids);

  if amount_value > 0 then
    select id into tx_id
    from public.financial_transactions
    where registration_request_id = p_request_id
      and status <> 'cancelled'
    limit 1;

    if tx_id is null then
      insert into public.financial_transactions (
        event_id, direction, category, description, counterparty, amount,
        status, competence_date, settled_on, payment_method,
        registration_request_id, notes, created_by
      ) values (
        request_row.event_id,
        'income',
        'registration',
        'Inscricao - ' || request_row.competitor_name || ' / ' || request_row.horse_name,
        request_row.competitor_name,
        amount_value,
        'settled',
        current_date,
        current_date,
        'PIX/Comprovante',
        request_row.id,
        request_row.payment_notes,
        auth.uid()
      );
    else
      update public.financial_transactions
      set
        amount = amount_value,
        status = 'settled',
        settled_on = current_date,
        notes = request_row.payment_notes,
        updated_at = now()
      where id = tx_id;
    end if;
  end if;

  return request_row;
end;
$$;

create or replace function public.reject_registration_payment(
  p_request_id uuid,
  p_payment_notes text default null
)
returns public.registration_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.registration_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem rejeitar pagamentos.' using errcode = '42501';
  end if;

  update public.registration_requests
  set
    payment_status = 'rejected',
    payment_notes = nullif(trim(coalesce(p_payment_notes, 'Comprovante rejeitado pela organizacao.')), ''),
    updated_at = now()
  where id = p_request_id
  returning * into request_row;

  if not found then
    raise exception 'Solicitacao de inscricao nao encontrada.';
  end if;

  update public.entries
  set payment_status = 'rejected'
  where id = any(request_row.entry_ids);

  return request_row;
end;
$$;

create or replace function public.ensure_score_entry_payment_confirmed()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.entries e
    where e.id = new.entry_id
      and e.payment_status not in ('confirmed', 'waived')
  ) then
    raise exception 'Pagamento da inscricao ainda nao confirmado.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_scores_payment_confirmed on public.scores;
create trigger trg_scores_payment_confirmed
before insert or update of entry_id, score, penalties
on public.scores
for each row execute function public.ensure_score_entry_payment_confirmed();

revoke all on function public.approve_registration_request(uuid) from public;
revoke all on function public.submit_registration_payment_receipt(uuid, text) from public;
revoke all on function public.confirm_registration_payment(uuid, text) from public;
revoke all on function public.reject_registration_payment(uuid, text) from public;

grant execute on function public.approve_registration_request(uuid) to authenticated;
grant execute on function public.submit_registration_payment_receipt(uuid, text) to authenticated;
grant execute on function public.confirm_registration_payment(uuid, text) to authenticated;
grant execute on function public.reject_registration_payment(uuid, text) to authenticated;
