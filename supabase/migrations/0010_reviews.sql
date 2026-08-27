-- TaskHop: Accept Helper lifecycle + Ratings & Reviews.
--
-- Part 1 extends task_interests (the existing owner<->helper connection
-- primitive) with an explicit "accepted" flag, because today NOTHING
-- distinguishes "the person who actually did the work" from "everyone who
-- ever expressed interest or was invited" -- confirmed by inspection: no
-- code path anywhere sets task status to in_progress, and task_interests
-- has no status/selection column at all. Without this, review eligibility
-- would incorrectly extend to every interested helper, not just the one
-- the owner actually worked with.
--
-- Part 2 adds the reviews table, gated on task completion AND on that
-- accepted flag.
--
-- Existing tasks/task_interests/messages SELECT/DELETE policies are NOT
-- touched. One new UPDATE policy is ADDED to task_interests (it currently
-- has none) -- this is additive, not a modification of any existing rule.
--
-- Run once in the Supabase SQL Editor (or via `supabase db push`) after
-- 0009_trust_safety.sql.

-- ---------------------------------------------------------------------------
-- Part 1: Accept Helper
-- ---------------------------------------------------------------------------
alter table public.task_interests
  add column if not exists accepted boolean not null default false;

comment on column public.task_interests.accepted is
  'Set true by the task owner to mark this as the one connection they actually worked with. At most one accepted row per task (see unique index below). This -- not mere interest -- is what makes someone review-eligible.';

-- At most one accepted helper per task.
create unique index if not exists task_interests_one_accepted_per_task
  on public.task_interests (task_id)
  where accepted = true;

-- New policy (task_interests had zero UPDATE policies before this).
-- Deliberately scoped to status in ('open', 'matching') -- this is the real
-- lock, not just a UI hint: once a task reaches in_progress (helper locked
-- in) or is completed/cancelled, no UPDATE to `accepted` is possible at
-- all, even by the owner, even via a direct API call. This matters for
-- review integrity too -- it stops an owner from swapping the accepted
-- helper after completion to game who's review-eligible.
create policy "task owners can accept a helper while the task is open or matching"
  on public.task_interests for update
  using (
    exists (
      select 1 from public.tasks
      where tasks.id = task_interests.task_id
        and tasks.created_by = auth.uid()
        and tasks.status in ('open', 'matching')
    )
  )
  with check (
    exists (
      select 1 from public.tasks
      where tasks.id = task_interests.task_id
        and tasks.created_by = auth.uid()
        and tasks.status in ('open', 'matching')
    )
  );

-- Defense in depth: the grant restricts this UPDATE to the one column that
-- should ever change via this policy -- an owner can flip `accepted`, but
-- can't use this same policy to rewrite helper_id/task_id/initiated_by.
grant update (accepted) on public.task_interests to authenticated;

-- ---------------------------------------------------------------------------
-- accept_helper(): atomic accept/reassign.
--
-- The client previously did this as two sequential REST UPDATEs (unaccept
-- old, accept new), which is not atomic -- a dropped connection, a killed
-- app, or a concurrent status change between the two calls could leave the
-- first UPDATE committed and the second silently matching zero rows
-- (PostgREST returns success with no rows affected, not an error), leaving
-- the task with no accepted helper at all while the client believes it
-- succeeded. Wrapping both statements in one function call makes them a
-- single transaction: if the second UPDATE affects zero rows, the
-- exception below rolls back the first UPDATE too, so the task is left
-- exactly as it was, never in an unintended zero-helper state.
--
-- SECURITY INVOKER (the default, stated explicitly here for clarity): this
-- function runs with the CALLING user's privileges, not the function
-- owner's. auth.uid() and RLS both evaluate exactly as they would for a
-- direct client UPDATE -- the policy above (owner-only, status in ('open',
-- 'matching')) is what actually authorizes both statements inside this
-- function. The function adds atomicity; it does not add or bypass any
-- authorization. A SECURITY DEFINER version would risk running as a role
-- that bypasses RLS entirely, which is exactly what's being avoided here.
--
-- The single "zero rows affected" check on the second UPDATE covers every
-- rejection reason at once, because RLS makes an unauthorized/ineligible
-- row simply not match rather than raising a distinct error: the target
-- task_interest not existing, belonging to a different task, having been
-- withdrawn (task_interests rows are hard-deleted by withdrawInterest()),
-- or the task no longer being open/matching all collapse to the same
-- "zero rows updated" outcome, and are all reported as one clear error.
create or replace function public.accept_helper(p_task_id uuid, p_task_interest_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated_count integer;
begin
  update public.task_interests
    set accepted = false
    where task_id = p_task_id
      and accepted = true;

  update public.task_interests
    set accepted = true
    where id = p_task_interest_id
      and task_id = p_task_id;

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception 'This helper can no longer be accepted for this task.';
  end if;
end;
$$;

-- Explicit: block anonymous callers, allow only authenticated users. RLS
-- inside the function still restricts it further to the task's own owner.
revoke all on function public.accept_helper(uuid, uuid) from public;
grant execute on function public.accept_helper(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Part 2: reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewed_user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 500),
  created_at timestamptz not null default now(),
  constraint reviews_no_self_review check (reviewer_id != reviewed_user_id),
  unique (task_id, reviewer_id)
);

create index reviews_reviewed_user_id_idx on public.reviews (reviewed_user_id);
create index reviews_task_id_idx on public.reviews (task_id);

comment on table public.reviews is
  'One review per (task, reviewer). Only the task owner and the accepted helper on a completed task may review each other -- enforced by RLS, not just the client.';

alter table public.reviews enable row level security;

-- Public read: this is the point of the feature -- other users need to see
-- someone's rating/review history before deciding to work with them. Same
-- precedent as profiles/tasks/skills (all "using (true)").
create policy "reviews are publicly readable"
  on public.reviews for select
  using (true);

-- Every requirement from the Security section is verified in this one
-- EXISTS clause: reviewer identity (auth.uid() = reviewer_id), completed
-- task, legitimate participation (accepted = true, not mere interest),
-- reviewer != reviewed user (also a table constraint above), and that
-- reviewed_user_id is genuinely the *other* participant of that exact
-- accepted connection -- not a random or unrelated-task user.
create policy "accepted participants can review each other after completion"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id
    and reviewer_id != reviewed_user_id
    and exists (
      select 1
      from public.task_interests ti
      join public.tasks t on t.id = ti.task_id
      where ti.task_id = reviews.task_id
        and ti.accepted = true
        and t.status = 'completed'
        and (
          (ti.helper_id = auth.uid() and t.created_by = reviews.reviewed_user_id)
          or
          (t.created_by = auth.uid() and ti.helper_id = reviews.reviewed_user_id)
        )
    )
  );

-- No UPDATE/DELETE policy: reviews are immutable in v1, by design.

-- Deliberately no reference to public.blocks anywhere above: a later block
-- between two people must not erase their ability to review a legitimately
-- completed historical task. Deliberately no deleted_at filtering on tasks
-- either: a permanently-deleted task's reviews remain valid history on the
-- reviewed user's profile.
