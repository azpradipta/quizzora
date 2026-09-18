-- Quizzora: skema database Supabase.
-- Jalankan sekali di Supabase Dashboard > SQL Editor > New query > Run.

create extension if not exists pgcrypto;

-- ===== Kelas & siswa =====
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  class_id uuid not null references public.classes on delete cascade,
  name text not null,
  card_number int not null,
  created_at timestamptz not null default now(),
  unique (class_id, card_number)
);

-- ===== Kuis & soal =====
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  quiz_id uuid not null references public.quizzes on delete cascade,
  position int not null default 0,
  text text not null default '',
  image_url text,
  options text[] not null default array['', '', '', ''],
  correct smallint not null default 0 check (correct between 0 and 3)
);

-- ===== Sesi ulangan (menyimpan salinan soal & siswa supaya laporan tidak berubah
-- walau kuis/kelas diedit kemudian) =====
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  quiz_id uuid references public.quizzes on delete set null,
  class_id uuid references public.classes on delete set null,
  quiz_title text not null,
  class_name text not null,
  questions jsonb not null,  -- [{text, image_url, options, correct}]
  students jsonb not null,   -- [{name, card_number}]
  current_index int not null default 0,
  phase text not null default 'question' check (phase in ('question', 'reveal')),
  status text not null default 'live' check (status in ('live', 'ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.responses (
  session_id uuid not null references public.sessions on delete cascade,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  question_index int not null,
  card_number int not null,
  answer smallint not null check (answer between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (session_id, question_index, card_number)
);

create index if not exists students_class_idx on public.students (class_id);
create index if not exists questions_quiz_idx on public.questions (quiz_id, position);
create index if not exists sessions_owner_idx on public.sessions (owner, created_at desc);

-- ===== Keamanan: setiap baris hanya bisa diakses pemiliknya =====
do $$
declare t text;
begin
  foreach t in array array['classes', 'students', 'quizzes', 'questions', 'sessions', 'responses'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_all" on public.%I', t);
    execute format('create policy "owner_all" on public.%I for all to authenticated
                    using (owner = auth.uid()) with check (owner = auth.uid())', t);
  end loop;
end $$;

-- ===== Realtime: layar proyektor & HP saling sinkron =====
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'sessions') then
    alter publication supabase_realtime add table public.sessions;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'responses') then
    alter publication supabase_realtime add table public.responses;
  end if;
end $$;
alter table public.responses replica identity full;

-- ===== Penyimpanan gambar soal =====
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

drop policy if exists "qi_insert" on storage.objects;
create policy "qi_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'question-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "qi_delete" on storage.objects;
create policy "qi_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'question-images' and (storage.foldername(name))[1] = auth.uid()::text);
