-- ==========================================
-- NTMR - PASSO A PASSO SQL (EXECUTAR EM ORDEM)
-- ==========================================

-- PASSO 1) Estrutura base + RLS + Auth + views
-- Execute TODO o conteudo de:
-- supabase/migrations/202605220001_init_ntmr.sql

-- PASSO 2) Ajustes NTMR (categorias sem nivel + ranking por pontos)
-- Execute TODO o conteudo de:
-- supabase/migrations/202605240001_levels_optional_points_ranking.sql

-- PASSO 3) Dados de exemplo inspirados na planilha NTMR
-- Execute TODO o conteudo de:
-- supabase/migrations/202605220002_seed_ntmr_sample.sql

-- PASSO 4) Confirmar que seu usuario existe no Auth
-- Troque o e-mail abaixo e rode:
select id, email, created_at
from auth.users
where lower(email) = lower('SEU_EMAIL_AQUI');

-- Se NAO retornar linha, cadastre esse e-mail no app primeiro (/login).

-- PASSO 5) Promover para admin
-- Troque o e-mail abaixo e rode:
insert into public.profiles (id, email, role, active)
select u.id, u.email, 'admin', true
from auth.users u
where lower(u.email) = lower('SEU_EMAIL_AQUI')
on conflict (id) do update
set role = 'admin',
    active = true,
    email = excluded.email,
    updated_at = now();

-- PASSO 6) Validar perfil
-- Troque o e-mail abaixo e rode:
select p.id, p.email, p.role, p.active
from public.profiles p
where lower(p.email) = lower('SEU_EMAIL_AQUI');

-- Esperado: role = admin e active = true

-- PASSO 7) Checagem rapida das tabelas
select 'profiles' as tabela, count(*) from public.profiles
union all
select 'events', count(*) from public.events
union all
select 'categories', count(*) from public.categories
union all
select 'competitors', count(*) from public.competitors
union all
select 'horses', count(*) from public.horses
union all
select 'entries', count(*) from public.entries
union all
select 'scores', count(*) from public.scores;
