-- Seeds de referência com base na planilha NTMR (uso para testes locais)
do $$
declare
  v_event_id uuid;
  v_judge_id uuid;
begin
  insert into public.events (name, location, starts_on, ends_on, prize_pool, status, notes)
  values (
    'NTMR - Campeonato Exemplo 2026',
    'Uberlândia - MG',
    '2026-09-19',
    '2026-09-20',
    50000,
    'published',
    'Base de testes inspirada na planilha oficial NTMR.'
  )
  on conflict do nothing;

  select id into v_event_id
  from public.events
  where name = 'NTMR - Campeonato Exemplo 2026'
  limit 1;

  if v_event_id is null then
    return;
  end if;

  insert into public.categories (event_id, name, level, active, display_order)
  values
    (v_event_id, 'Amador Principiante', null, true, 1),
    (v_event_id, 'Amador Master', null, true, 2),
    (v_event_id, 'Aberto', 'N1', true, 3),
    (v_event_id, 'Aberto', 'N2', true, 4),
    (v_event_id, 'Aberto', 'N3', true, 5),
    (v_event_id, 'Aberto', 'N4', true, 6),
    (v_event_id, 'Amador', 'N1', true, 7),
    (v_event_id, 'Amador', 'N2', true, 8),
    (v_event_id, 'Amador', 'N3', true, 9),
    (v_event_id, 'Amador', 'N4', true, 10),
    (v_event_id, 'Aberto Principiante', null, true, 11),
    (v_event_id, 'Jovem Principiante', null, true, 12),
    (v_event_id, 'Pré Futurity', null, true, 13),
    (v_event_id, 'Potro do Futuro', null, true, 14),
    (v_event_id, 'Futurity', 'N1', true, 15),
    (v_event_id, 'Futurity', 'N2', true, 16),
    (v_event_id, 'Futurity', 'N3', true, 17),
    (v_event_id, 'Futurity', 'N4', true, 18)
  on conflict do update
  set active = excluded.active,
      display_order = excluded.display_order;

  insert into public.competitors (name, city, uf)
  values
    ('Luciano de Pina', 'Rio Verde', 'GO'),
    ('Evandro de Oliveira', 'Palmas', 'TO'),
    ('Lucas Jose Natal', 'Patrocínio', 'MG'),
    ('Cristiano de Pina', 'Rio Verde', 'GO'),
    ('Leonardo Frederico Martins Leão', 'Rio Verde', 'GO'),
    ('Daniella Spini Heitor', 'Uberlândia', 'MG'),
    ('Matheus Gabriel S. de Oliveira', 'Cuiabá', 'MT'),
    ('Giliard Carlos de Oliveira', 'Uberaba', 'MG')
  on conflict do nothing;

  insert into public.horses (name, registration, owner)
  values
    ('Spook Off Sparks', 'P319005', 'Sarah Martins do Vale'),
    ('Brown Sugar Dunit', 'P278631', 'Hugo Lorenzo Poerto'),
    ('Gunner N Spook', 'P318286', 'Lucas José Natal'),
    ('Shine Gottachic', 'P347182', 'Ricardo Martins Diniz'),
    ('Einstein Spook', 'P323543', 'Leonardo Frederico Martins'),
    ('Joy My Gun', 'P259045', 'Daniella Spini Heitor'),
    ('Easys For Whizkey', 'P1139988', 'Gustavo Fernandes da Silva'),
    ('My Chic Gotta Gun', 'P360821', 'Felipe Assumpção Furtado')
  on conflict do nothing;

  -- Inscrições por etapa (1 e 2)
  insert into public.entries (event_id, competitor_id, horse_id, category_id, level, stage, entry_number, draw_order, status)
  select
    v_event_id,
    c.id,
    h.id,
    cat.id,
    cat.level,
    stage_data.stage,
    stage_data.entry_number,
    stage_data.draw_order,
    'registered'
  from (
    values
      ('Luciano de Pina', 'Spook Off Sparks', 'Aberto', 'N1', 1, '01', 1),
      ('Evandro de Oliveira', 'Brown Sugar Dunit', 'Aberto', 'N1', 1, '02', 2),
      ('Lucas Jose Natal', 'Gunner N Spook', 'Aberto', 'N1', 1, '03', 3),
      ('Cristiano de Pina', 'Shine Gottachic', 'Aberto', 'N1', 1, '04', 4),
      ('Leonardo Frederico Martins Leão', 'Einstein Spook', 'Amador', 'N1', 1, '05', 5),
      ('Daniella Spini Heitor', 'Joy My Gun', 'Amador', 'N1', 1, '06', 6),
      ('Matheus Gabriel S. de Oliveira', 'Easys For Whizkey', 'Pré Futurity', null, 1, '07', 7),
      ('Giliard Carlos de Oliveira', 'My Chic Gotta Gun', 'Pré Futurity', null, 1, '08', 8),
      ('Luciano de Pina', 'Spook Off Sparks', 'Aberto', 'N1', 2, '01', 1),
      ('Evandro de Oliveira', 'Brown Sugar Dunit', 'Aberto', 'N1', 2, '02', 2),
      ('Lucas Jose Natal', 'Gunner N Spook', 'Aberto', 'N1', 2, '03', 3),
      ('Cristiano de Pina', 'Shine Gottachic', 'Aberto', 'N1', 2, '04', 4),
      ('Leonardo Frederico Martins Leão', 'Einstein Spook', 'Amador', 'N1', 2, '05', 5),
      ('Daniella Spini Heitor', 'Joy My Gun', 'Amador', 'N1', 2, '06', 6),
      ('Matheus Gabriel S. de Oliveira', 'Easys For Whizkey', 'Pré Futurity', null, 2, '07', 7),
      ('Giliard Carlos de Oliveira', 'My Chic Gotta Gun', 'Pré Futurity', null, 2, '08', 8)
  ) as stage_data(competitor_name, horse_name, category_name, level, stage, entry_number, draw_order)
  join public.competitors c on c.name = stage_data.competitor_name
  join public.horses h on h.name = stage_data.horse_name
  join public.categories cat on cat.event_id = v_event_id
    and cat.name = stage_data.category_name
    and cat.level is not distinct from stage_data.level
  on conflict do nothing;

  -- Notas de exemplo (somente se existir perfil de juiz/admin)
  select id into v_judge_id
  from public.profiles
  where role in ('admin', 'judge')
  order by created_at asc
  limit 1;

  if v_judge_id is not null then
    insert into public.scores (event_id, entry_id, judge_id, stage, score, penalties, notes)
    select
      v_event_id,
      e.id,
      v_judge_id,
      s.stage,
      s.score,
      s.penalties,
      s.notes
    from (
      values
        ('Luciano de Pina', 'Spook Off Sparks', 'Aberto', 'N1', 1, 71.0, 0.0, 'Rodada consistente'),
        ('Evandro de Oliveira', 'Brown Sugar Dunit', 'Aberto', 'N1', 1, 70.0, 0.5, 'Pequena penalidade'),
        ('Lucas Jose Natal', 'Gunner N Spook', 'Aberto', 'N1', 1, 69.5, 0.0, 'Boa execução'),
        ('Cristiano de Pina', 'Shine Gottachic', 'Aberto', 'N1', 1, 68.0, 0.0, 'Sem penalidades'),
        ('Leonardo Frederico Martins Leão', 'Einstein Spook', 'Amador', 'N1', 1, 69.5, 0.0, 'Base planilha Amador'),
        ('Daniella Spini Heitor', 'Joy My Gun', 'Amador', 'N1', 1, 67.5, 0.0, 'Base planilha Amador'),
        ('Matheus Gabriel S. de Oliveira', 'Easys For Whizkey', 'Pré Futurity', null, 1, 73.0, 0.0, 'Base planilha Pré Futurity'),
        ('Giliard Carlos de Oliveira', 'My Chic Gotta Gun', 'Pré Futurity', null, 1, 68.0, 0.0, 'Base planilha Pré Futurity'),
        ('Luciano de Pina', 'Spook Off Sparks', 'Aberto', 'N1', 2, 71.5, 0.0, '2ª etapa'),
        ('Evandro de Oliveira', 'Brown Sugar Dunit', 'Aberto', 'N1', 2, 70.0, 0.0, '2ª etapa'),
        ('Lucas Jose Natal', 'Gunner N Spook', 'Aberto', 'N1', 2, 70.0, 0.0, '2ª etapa'),
        ('Cristiano de Pina', 'Shine Gottachic', 'Aberto', 'N1', 2, 69.0, 0.0, '2ª etapa'),
        ('Leonardo Frederico Martins Leão', 'Einstein Spook', 'Amador', 'N1', 2, 71.5, 0.0, 'Base planilha Amador'),
        ('Daniella Spini Heitor', 'Joy My Gun', 'Amador', 'N1', 2, 70.0, 0.0, 'Base planilha Amador'),
        ('Matheus Gabriel S. de Oliveira', 'Easys For Whizkey', 'Pré Futurity', null, 2, 72.5, 0.0, '2ª etapa de teste'),
        ('Giliard Carlos de Oliveira', 'My Chic Gotta Gun', 'Pré Futurity', null, 2, 69.5, 0.0, 'Base planilha Pré Futurity')
    ) as s(competitor_name, horse_name, category_name, level, stage, score, penalties, notes)
    join public.competitors c on c.name = s.competitor_name
    join public.horses h on h.name = s.horse_name
    join public.categories cat on cat.event_id = v_event_id
      and cat.name = s.category_name
      and cat.level is not distinct from s.level
    join public.entries e
      on e.event_id = v_event_id
      and e.competitor_id = c.id
      and e.horse_id = h.id
      and e.category_id = cat.id
      and e.level is not distinct from s.level
      and e.stage = s.stage
    on conflict (entry_id, judge_id, stage) do update
      set score = excluded.score,
          penalties = excluded.penalties,
          notes = excluded.notes,
          updated_at = now();
  end if;
end $$;
