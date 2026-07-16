-- Permite ajustar o valor total de uma inscricao e anexar comprovantes em imagem.

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
    select 1 from public.categories c
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
    request_row.competitor_name, request_row.competitor_document,
    request_row.competitor_city, request_row.competitor_uf
  );
  horse_id_value := public.find_or_create_horse(
    request_row.horse_name, request_row.horse_registration, request_row.horse_owner
  );

  for category_to_create in
    select c.id, c.level, coalesce(c.entry_fee, 0) as entry_fee
    from public.categories c
    where c.event_id = request_row.event_id
      and (
        (category_is_leveled and lower(trim(c.name)) = lower(trim(category_row.name)) and c.level = any(levels_to_create))
        or (not category_is_leveled and c.id = request_row.category_id)
      )
    order by array_position(array['N1', 'N2', 'N3', 'N4']::text[], c.level)
  loop
    foreach stage_value in array request_row.stages loop
      begin
        insert into public.entries (
          event_id, competitor_id, horse_id, category_id, level, stage, status,
          entry_fee, payment_status, payment_confirmed_at
        ) values (
          request_row.event_id, competitor_id_value, horse_id_value,
          category_to_create.id, category_to_create.level, stage_value, 'registered',
          category_to_create.entry_fee, request_row.payment_status, request_row.payment_confirmed_at
        ) returning id into entry_id_value;
      exception when unique_violation then
        select id into entry_id_value from public.entries
        where event_id = request_row.event_id
          and competitor_id = competitor_id_value
          and horse_id = horse_id_value
          and category_id = category_to_create.id
          and stage = stage_value
          and level is not distinct from category_to_create.level
        limit 1;
        update public.entries
        set entry_fee = category_to_create.entry_fee,
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
  set status = 'approved',
      amount_due = coalesce(nullif(request_row.amount_due, 0), public.calculate_registration_amount(event_id, category_id, requested_levels, stages)),
      entry_ids = result_ids,
      approved_by = auth.uid(),
      approved_at = now(),
      updated_at = now()
  where id = p_request_id;

  return result_ids;
end;
$$;

create or replace function public.update_registration_request_amount(
  p_request_id uuid,
  p_amount numeric
)
returns public.registration_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.registration_requests%rowtype;
  transaction_id uuid;
  amount_value numeric(14, 2);
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar o valor.' using errcode = '42501';
  end if;

  amount_value := round(coalesce(p_amount, 0), 2);
  if amount_value <= 0 then
    raise exception 'O valor da inscricao deve ser maior que zero.';
  end if;

  select * into request_row
  from public.registration_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitacao de inscricao nao encontrada.';
  end if;
  if request_row.status = 'cancelled' then
    raise exception 'Nao e possivel alterar uma inscricao cancelada.';
  end if;

  update public.registration_requests
  set amount_due = amount_value, updated_at = now()
  where id = p_request_id
  returning * into request_row;

  if request_row.payment_status = 'confirmed' then
    select id into transaction_id
    from public.financial_transactions
    where registration_request_id = p_request_id
      and status <> 'cancelled'
    limit 1;

    if transaction_id is null then
      insert into public.financial_transactions (
        event_id, direction, category, description, counterparty, amount,
        status, competence_date, settled_on, payment_method,
        registration_request_id, notes, created_by
      ) values (
        request_row.event_id, 'income', 'registration',
        'Inscricao - ' || request_row.competitor_name || ' / ' || request_row.horse_name,
        request_row.competitor_name, amount_value, 'settled', current_date,
        current_date, 'PIX/Comprovante', request_row.id, request_row.payment_notes, auth.uid()
      );
    else
      update public.financial_transactions
      set amount = amount_value, status = 'settled', settled_on = current_date,
          notes = request_row.payment_notes, updated_at = now()
      where id = transaction_id;
    end if;
  end if;

  return request_row;
end;
$$;

revoke all on function public.update_registration_request_amount(uuid, numeric) from public;
grant execute on function public.update_registration_request_amount(uuid, numeric) to authenticated;
revoke all on function public.approve_registration_request(uuid) from public;
grant execute on function public.approve_registration_request(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payment_receipts_insert_own on storage.objects;
create policy payment_receipts_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-receipts'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists payment_receipts_delete_own on storage.objects;
create policy payment_receipts_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-receipts'
  and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin())
);
