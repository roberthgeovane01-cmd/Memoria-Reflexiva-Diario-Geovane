-- Índices em toda coluna de chave estrangeira que ainda não tinha um
-- (evita sequential scans nos JOINs usados pelas policies de RLS acima).

create index if not exists idx_author_profiles_user_id on public.author_profiles (user_id);
create index if not exists idx_author_profile_versions_author_profile_id on public.author_profile_versions (author_profile_id);
create index if not exists idx_author_profile_versions_user_id on public.author_profile_versions (user_id);
create index if not exists idx_import_batches_user_id on public.import_batches (user_id);
create index if not exists idx_historical_reflections_user_id on public.historical_reflections (user_id);
create index if not exists idx_historical_reflections_import_batch_id on public.historical_reflections (import_batch_id);
create index if not exists idx_historical_reflection_chunks_reflection_id on public.historical_reflection_chunks (reflection_id);
create index if not exists idx_historical_reflection_chunks_user_id on public.historical_reflection_chunks (user_id);
create index if not exists idx_reflection_sessions_user_id on public.reflection_sessions (user_id);
create index if not exists idx_daily_sources_user_id on public.daily_sources (user_id);
create index if not exists idx_reflection_comments_user_id on public.reflection_comments (user_id);
create index if not exists idx_generated_reflections_session_id on public.generated_reflections (session_id);
create index if not exists idx_generated_reflections_user_id on public.generated_reflections (user_id);
create index if not exists idx_reflection_edits_generated_reflection_id on public.reflection_edits (generated_reflection_id);
create index if not exists idx_reflection_edits_session_id on public.reflection_edits (session_id);
create index if not exists idx_reflection_edits_user_id on public.reflection_edits (user_id);
create index if not exists idx_approved_reflections_source_generation_id on public.approved_reflections (source_generation_id);
create index if not exists idx_approved_reflections_user_id on public.approved_reflections (user_id);
create index if not exists idx_retrieval_references_generated_reflection_id on public.retrieval_references (generated_reflection_id);
create index if not exists idx_retrieval_references_historical_reflection_id on public.retrieval_references (historical_reflection_id);
create index if not exists idx_retrieval_references_chunk_id on public.retrieval_references (chunk_id);
create index if not exists idx_retrieval_references_user_id on public.retrieval_references (user_id);
create index if not exists idx_generated_audio_approved_reflection_id on public.generated_audio (approved_reflection_id);
create index if not exists idx_generated_audio_session_id on public.generated_audio (session_id);
create index if not exists idx_generated_audio_user_id on public.generated_audio (user_id);
create index if not exists idx_processing_jobs_user_id on private.processing_jobs (user_id);
create index if not exists idx_processing_jobs_session_id on private.processing_jobs (session_id);
