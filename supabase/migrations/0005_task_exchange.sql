-- TaskHop: exchange/offer information on tasks (Skill Exchange or Money).
-- This is NOT a payment-processing system -- offered_amount/payment_status
-- only record what the task creator offered; no money actually moves
-- through TaskHop yet. Adds columns to the existing tasks table --
-- deliberately no new table, since the offer is a fixed property of the
-- task itself (chosen once at creation), not a separate relation.
-- Run once in the Supabase SQL Editor (or via `supabase db push`) after
-- 0004_messaging.sql.

alter table public.tasks
  add column if not exists exchange_type text not null default 'skill'
    check (exchange_type in ('skill', 'money')),
  add column if not exists offered_skill text,
  add column if not exists offered_amount numeric(10, 2),
  add column if not exists payment_status text
    check (payment_status is null or payment_status in ('payment_pending', 'paid'));

-- Backfill tasks created before this feature existed, so the
-- offer-completeness constraint below can be added without failing on
-- pre-existing data.
update public.tasks
set offered_skill = 'Not specified'
where offered_skill is null and offered_amount is null;

-- A task must clearly state its offer: a skill-exchange task needs a
-- non-empty offered_skill description, a money task needs a positive
-- offered_amount. Enforced here (not just client-side) so this can't be
-- bypassed by calling the API directly.
alter table public.tasks
  add constraint tasks_exchange_offer_check check (
    (exchange_type = 'skill' and offered_skill is not null and length(trim(offered_skill)) > 0)
    or
    (exchange_type = 'money' and offered_amount is not null and offered_amount > 0)
  );

comment on column public.tasks.exchange_type is
  'What the task creator offers in return: a skill/help swap, or money. Not a payment system -- money is recorded, not processed.';
comment on column public.tasks.offered_skill is
  'Free-text description of the skill/help offered in exchange. Set when exchange_type = skill.';
comment on column public.tasks.offered_amount is
  'Amount offered, in the app''s currency (Rs.). Set only when exchange_type = money.';
comment on column public.tasks.payment_status is
  'Reserved for a future escrow/payment feature. The app sets it to payment_pending for money tasks at creation; nothing in the current app ever sets it to paid.';
