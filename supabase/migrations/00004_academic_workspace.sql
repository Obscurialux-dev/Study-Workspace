-- 00004_academic_workspace.sql — Phase 4: materials, notes, assignments,
-- discussions, and the private workspace-files storage bucket. Nothing else.

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.tuton_sessions (id) on delete set null,
  title text not null check (length(btrim(title)) > 0),
  module_name text,
  topic text,
  content text,
  source text,
  file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.materials is
  'Academic material resource. Owned by the user; belongs to a course.';

create index materials_course_id_idx on public.materials (course_id);

create trigger on_materials_updated_at
  before update on public.materials
  for each row
  execute function public.set_updated_at();

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  material_id uuid references public.materials (id) on delete set null,
  title text not null check (length(btrim(title)) > 0),
  content text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notes is
  'Note. Global (no course) or course-specific; optionally related to a material.';

create index notes_user_id_idx on public.notes (user_id);

create trigger on_notes_updated_at
  before update on public.notes
  for each row
  execute function public.set_updated_at();

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.tuton_sessions (id) on delete set null,
  title text not null check (length(btrim(title)) > 0),
  description text,
  deadline date not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  external_url text,
  file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.assignments is
  'Assignment tracking record. The actual work happens externally.';

create index assignments_course_id_idx on public.assignments (course_id);

create trigger on_assignments_updated_at
  before update on public.assignments
  for each row
  execute function public.set_updated_at();

create table public.discussions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.tuton_sessions (id) on delete set null,
  title text not null check (length(btrim(title)) > 0),
  deadline date not null,
  external_url text,
  response_text text,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.discussions is
  'Tuton discussion tracking record. The actual discussion happens on the Tuton website.';

create index discussions_course_id_idx on public.discussions (course_id);

create trigger on_discussions_updated_at
  before update on public.discussions
  for each row
  execute function public.set_updated_at();

-- Row Level Security: ownership = own user_id + own course.
alter table public.materials enable row level security;

create policy "users_select_own_materials"
  on public.materials for select
  using (auth.uid() = user_id);

create policy "users_insert_own_materials"
  on public.materials for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    )
  );

create policy "users_update_own_materials"
  on public.materials for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    )
  );

create policy "users_delete_own_materials"
  on public.materials for delete
  using (auth.uid() = user_id);

alter table public.notes enable row level security;

create policy "users_select_own_notes"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "users_insert_own_notes"
  on public.notes for insert
  with check (
    auth.uid() = user_id
    and (course_id is null or exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    ))
    and (material_id is null or exists (
      select 1 from public.materials m
      where m.id = material_id and m.user_id = auth.uid()
    ))
  );

create policy "users_update_own_notes"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (course_id is null or exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    ))
    and (material_id is null or exists (
      select 1 from public.materials m
      where m.id = material_id and m.user_id = auth.uid()
    ))
  );

create policy "users_delete_own_notes"
  on public.notes for delete
  using (auth.uid() = user_id);

alter table public.assignments enable row level security;

create policy "users_select_own_assignments"
  on public.assignments for select
  using (auth.uid() = user_id);

create policy "users_insert_own_assignments"
  on public.assignments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    )
  );

create policy "users_update_own_assignments"
  on public.assignments for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    )
  );

create policy "users_delete_own_assignments"
  on public.assignments for delete
  using (auth.uid() = user_id);

alter table public.discussions enable row level security;

create policy "users_select_own_discussions"
  on public.discussions for select
  using (auth.uid() = user_id);

create policy "users_insert_own_discussions"
  on public.discussions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    )
  );

create policy "users_update_own_discussions"
  on public.discussions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    )
  );

create policy "users_delete_own_discussions"
  on public.discussions for delete
  using (auth.uid() = user_id);

-- Private Storage bucket for material/assignment files. Files are stored
-- under {user_id}/{entity}/... so only the owner can access them.
insert into storage.buckets (id, name, public)
values ('workspace-files', 'workspace-files', false)
on conflict (id) do nothing;

create policy "users_manage_own_workspace_files"
  on storage.objects for all
  to authenticated
  using ((storage.foldername(name))[1] = auth.uid()::text)
  with check ((storage.foldername(name))[1] = auth.uid()::text);
