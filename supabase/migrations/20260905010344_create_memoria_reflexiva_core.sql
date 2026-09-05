-- Snapshot versionado do schema já aplicado em produção (projeto Supabase
-- dxigfruylgfxnosmogky). Reconstituído a partir do estado real do banco para
-- que o histórico fique visível no GitHub — não é a migration original
-- (aplicada via painel/MCP antes deste snapshot existir), mas reproduz o
-- mesmo resultado em um projeto novo.

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

-- profiles ------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- author_profiles / author_profile_versions ----------------------------------

create table if not exists public.author_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  profile_name text not null default 'Perfil Autoral',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  version integer not null default 1 check (version > 0),
  style_summary text,
  style_rules jsonb not null default '{}'::jsonb,
  lexicon jsonb not null default '{}'::jsonb,
  structure_preferences jsonb not null default '{}'::jsonb,
  avoidances jsonb not null default '{}'::jsonb,
  source_count integer not null default 0 check (source_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.author_profiles enable row level security;

create table if not exists public.author_profile_versions (
  id uuid primary key default gen_random_uuid(),
  author_profile_id uuid not null references public.author_profiles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.author_profile_versions enable row level security;

-- import_batches / historical_reflections / chunks ---------------------------

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_name text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'partial', 'failed')),
  total_items integer not null default 0 check (total_items >= 0),
  processed_items integer not null default 0 check (processed_items >= 0),
  failed_items integer not null default 0 check (failed_items >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.import_batches enable row level security;

create table if not exists public.historical_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  import_batch_id uuid references public.import_batches (id) on delete set null,
  title text,
  body text not null,
  original_date date,
  source_reference text,
  themes text[] not null default '{}'::text[],
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.historical_reflections enable row level security;

create table if not exists public.historical_reflection_chunks (
  id uuid primary key default gen_random_uuid(),
  reflection_id uuid not null references public.historical_reflections (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  embedding extensions.vector,
  embedding_model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.historical_reflection_chunks enable row level security;

-- reflection_sessions / daily_sources / reflection_comments ------------------

create table if not exists public.reflection_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reflection_date date not null default current_date,
  status text not null default 'draft'
    check (status in ('draft', 'processing', 'review', 'approved', 'audio_processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reflection_sessions enable row level security;

create table if not exists public.daily_sources (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.reflection_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text,
  source_author text,
  raw_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daily_sources enable row level security;

create table if not exists public.reflection_comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.reflection_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  input_mode text not null default 'text' check (input_mode in ('text', 'audio', 'mixed')),
  text_comment text,
  audio_storage_path text,
  audio_mime_type text,
  audio_duration_seconds numeric check (audio_duration_seconds is null or audio_duration_seconds >= 0),
  transcript_raw text,
  transcript_edited text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reflection_comments enable row level security;

-- generated_reflections / reflection_edits / approved_reflections -----------

create table if not exists public.generated_reflections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reflection_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  title text,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'superseded', 'rejected')),
  model_provider text,
  model_name text,
  prompt_version text,
  input_snapshot jsonb not null default '{}'::jsonb,
  generation_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.generated_reflections enable row level security;

create table if not exists public.reflection_edits (
  id uuid primary key default gen_random_uuid(),
  generated_reflection_id uuid not null references public.generated_reflections (id) on delete cascade,
  session_id uuid not null references public.reflection_sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.reflection_edits enable row level security;

create table if not exists public.approved_reflections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.reflection_sessions (id) on delete cascade,
  source_generation_id uuid references public.generated_reflections (id) on delete set null,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text,
  body text not null,
  approved_at timestamptz not null default now()
);

alter table public.approved_reflections enable row level security;

-- retrieval_references / generated_audio -------------------------------------

create table if not exists public.retrieval_references (
  id uuid primary key default gen_random_uuid(),
  generated_reflection_id uuid not null references public.generated_reflections (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  historical_reflection_id uuid references public.historical_reflections (id) on delete set null,
  chunk_id uuid references public.historical_reflection_chunks (id) on delete set null,
  rank integer not null check (rank > 0),
  similarity double precision,
  reference_title_snapshot text,
  reference_text_snapshot text not null,
  created_at timestamptz not null default now()
);

alter table public.retrieval_references enable row level security;

create table if not exists public.generated_audio (
  id uuid primary key default gen_random_uuid(),
  approved_reflection_id uuid not null references public.approved_reflections (id) on delete cascade,
  session_id uuid not null references public.reflection_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'elevenlabs',
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  storage_path text,
  mime_type text not null default 'audio/mpeg',
  duration_seconds numeric check (duration_seconds is null or duration_seconds >= 0),
  provider_request_id text,
  generation_settings jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.generated_audio enable row level security;

-- schema private: só acessível via service/secret key (Edge Functions) ------

create schema if not exists private;

create table if not exists private.user_voice_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null default 'elevenlabs',
  voice_id text,
  settings jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.user_voice_settings enable row level security;

create table if not exists private.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.reflection_sessions (id) on delete set null,
  job_type text not null check (
    job_type in ('transcription', 'embedding', 'reflection_generation', 'audio_generation', 'memory_import', 'author_profile')
  ),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempt integer not null default 1 check (attempt > 0),
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.processing_jobs enable row level security;
