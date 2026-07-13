-- Financeiro por evento: fluxo de caixa e demonstrativo de resultado (DRE).

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  direction text not null,
  category text not null,
  description text not null,
  counterparty text,
  amount numeric(14, 2) not null,
  status text not null default 'pending',
  competence_date date not null default current_date,
  due_date date,
  settled_on date,
  payment_method text,
  registration_request_id uuid references public.registration_requests(id) on delete set null,
  entry_id uuid references public.entries(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_transactions_direction_check check (direction in ('income', 'expense')),
  constraint financial_transactions_status_check check (status in ('pending', 'settled', 'cancelled')),
  constraint financial_transactions_amount_check check (amount > 0),
  constraint financial_transactions_category_check check (length(trim(category)) > 0),
  constraint financial_transactions_description_check check (length(trim(description)) > 0),
  constraint financial_transactions_settlement_check check (
    (status = 'settled' and settled_on is not null)
    or (status <> 'settled')
  )
);

create index if not exists idx_financial_transactions_event_date
  on public.financial_transactions(event_id, competence_date desc);

create index if not exists idx_financial_transactions_event_status
  on public.financial_transactions(event_id, status);

create index if not exists idx_financial_transactions_event_direction
  on public.financial_transactions(event_id, direction);

create unique index if not exists idx_financial_transactions_registration_unique
  on public.financial_transactions(registration_request_id)
  where registration_request_id is not null and status <> 'cancelled';

drop trigger if exists trg_financial_transactions_updated_at on public.financial_transactions;
create trigger trg_financial_transactions_updated_at
before update on public.financial_transactions
for each row execute function public.set_updated_at();

alter table public.financial_transactions enable row level security;

drop policy if exists financial_transactions_admin_all on public.financial_transactions;
create policy financial_transactions_admin_all
on public.financial_transactions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.financial_transactions to authenticated;

