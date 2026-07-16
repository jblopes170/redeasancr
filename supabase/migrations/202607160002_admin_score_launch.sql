-- Administradores podem lancar notas durante a prova mesmo antes da confirmacao financeira.

create or replace function public.ensure_score_entry_payment_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and exists (
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
