-- Pre-autorizacao de acesso por e-mail para administradores e juizes.

create table if not exists public.access_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  role text not null default 'user',
  active boolean not null default true,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint access_invites_email_lowercase_check check (email = lower(trim(email))),
  constraint access_invites_role_check check (role in ('admin', 'judge', 'user'))
);

create index if not exists idx_access_invites_role on public.access_invites(role);

drop trigger if exists trg_access_invites_updated_at on public.access_invites;
create trigger trg_access_invites_updated_at
before update on public.access_invites
for each row execute function public.set_updated_at();

-- Aplica uma autorizacao existente quando o profile e criado pelo Supabase Auth.
create or replace function public.apply_access_invite_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invited public.access_invites%rowtype;
  verified_email text;
begin
  select lower(trim(email))
  into verified_email
  from auth.users
  where id = new.id;

  new.email := coalesce(verified_email, lower(trim(new.email)));

  select *
  into invited
  from public.access_invites
  where email = new.email
  limit 1;

  if found then
    new.role := invited.role;
    new.active := invited.active;
    new.name := coalesce(new.name, invited.name);
  end if;

  return new;
end;
$$;

revoke all on function public.apply_access_invite_to_profile() from public;

drop trigger if exists trg_profiles_apply_access_invite on public.profiles;
create trigger trg_profiles_apply_access_invite
before insert or update of email on public.profiles
for each row execute function public.apply_access_invite_to_profile();

-- Se o usuario ja existir, uma inclusao/alteracao no painel atualiza seu profile na hora.
create or replace function public.sync_access_invite_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    role = new.role,
    active = new.active,
    name = coalesce(public.profiles.name, new.name),
    updated_at = now()
  where lower(trim(email)) = new.email;

  return new;
end;
$$;

revoke all on function public.sync_access_invite_to_profile() from public;

drop trigger if exists trg_access_invites_sync_profile on public.access_invites;
create trigger trg_access_invites_sync_profile
after insert or update of role, active, name on public.access_invites
for each row execute function public.sync_access_invite_to_profile();

alter table public.access_invites enable row level security;

drop policy if exists access_invites_admin_all on public.access_invites;
create policy access_invites_admin_all
on public.access_invites
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.access_invites to authenticated;
