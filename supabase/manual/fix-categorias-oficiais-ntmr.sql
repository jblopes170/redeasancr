-- Categorias oficiais NTMR.
-- Rode este SQL no Supabase para acrescentar as categorias corretas nos eventos existentes.
-- Regra: somente Aberto, Amador e Futurity usam niveis N1, N2, N3 e N4.

do $$
declare
  preset record;
begin
  update public.categories c
  set name = 'Aberto'
  where lower(trim(c.name)) = 'aberta'
    and not exists (
      select 1
      from public.categories existing
      where existing.event_id = c.event_id
        and lower(trim(existing.name)) = 'aberto'
        and existing.level is not distinct from c.level
        and existing.id <> c.id
    );

  update public.categories c
  set name = 'Pré Futurity'
  where lower(trim(c.name)) = 'pre futurity'
    and not exists (
      select 1
      from public.categories existing
      where existing.event_id = c.event_id
        and lower(trim(existing.name)) = lower('Pré Futurity')
        and existing.level is not distinct from c.level
        and existing.id <> c.id
    );

  for preset in
    select *
    from (
      values
        ('Amador Principiante'::text, null::text, 1),
        ('Amador Master'::text, null::text, 2),
        ('Aberto'::text, 'N1'::text, 3),
        ('Aberto'::text, 'N2'::text, 4),
        ('Aberto'::text, 'N3'::text, 5),
        ('Aberto'::text, 'N4'::text, 6),
        ('Amador'::text, 'N1'::text, 7),
        ('Amador'::text, 'N2'::text, 8),
        ('Amador'::text, 'N3'::text, 9),
        ('Amador'::text, 'N4'::text, 10),
        ('Aberto Principiante'::text, null::text, 11),
        ('Jovem Principiante'::text, null::text, 12),
        ('Pré Futurity'::text, null::text, 13),
        ('Potro do Futuro'::text, null::text, 14),
        ('Futurity'::text, 'N1'::text, 15),
        ('Futurity'::text, 'N2'::text, 16),
        ('Futurity'::text, 'N3'::text, 17),
        ('Futurity'::text, 'N4'::text, 18)
    ) as preset(name, level, display_order)
  loop
    insert into public.categories (event_id, name, level, active, display_order)
    select
      events.id,
      preset.name,
      preset.level,
      true,
      preset.display_order
    from public.events
    where not exists (
      select 1
      from public.categories c
      where c.event_id = events.id
        and lower(trim(c.name)) = lower(trim(preset.name))
        and c.level is not distinct from preset.level
    );
  end loop;
end $$;
