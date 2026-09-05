-- Políticas de RLS: cada usuário só vê/edita os próprios dados. Tabelas do
-- schema private (voz, jobs internos) não têm policy — só acessíveis via
-- secret key nas Edge Functions.

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy author_profiles_select_own on public.author_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy author_profile_versions_select_own on public.author_profile_versions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy import_batches_select_own on public.import_batches
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy historical_reflections_select_own on public.historical_reflections
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy historical_reflection_chunks_select_own on public.historical_reflection_chunks
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy reflection_sessions_manage_own on public.reflection_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy daily_sources_manage_own on public.daily_sources
  for all to authenticated
  using (
    (select auth.uid()) = user_id
    and session_id in (
      select id from public.reflection_sessions where user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and session_id in (
      select id from public.reflection_sessions where user_id = (select auth.uid())
    )
  );

create policy reflection_comments_manage_own on public.reflection_comments
  for all to authenticated
  using (
    (select auth.uid()) = user_id
    and session_id in (
      select id from public.reflection_sessions where user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and session_id in (
      select id from public.reflection_sessions where user_id = (select auth.uid())
    )
  );

create policy generated_reflections_select_own on public.generated_reflections
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy reflection_edits_select_own on public.reflection_edits
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy reflection_edits_insert_own on public.reflection_edits
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and session_id in (
      select id from public.reflection_sessions where user_id = (select auth.uid())
    )
    and generated_reflection_id in (
      select id from public.generated_reflections where user_id = (select auth.uid())
    )
  );

create policy approved_reflections_select_own on public.approved_reflections
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy approved_reflections_insert_own on public.approved_reflections
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and session_id in (
      select id from public.reflection_sessions where user_id = (select auth.uid())
    )
    and (
      source_generation_id is null
      or source_generation_id in (
        select id from public.generated_reflections where user_id = (select auth.uid())
      )
    )
  );

create policy retrieval_references_select_own on public.retrieval_references
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy generated_audio_select_own on public.generated_audio
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Storage: cada usuário só acessa a própria pasta (primeiro segmento do path
-- = auth.uid()). O bucket de saída (áudio narrado) só recebe escrita das
-- Edge Functions, via secret key — por isso não tem policy de insert aqui.

create policy reflection_input_audio_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'reflection-input-audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy reflection_input_audio_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'reflection-input-audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy reflection_input_audio_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'reflection-input-audio' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'reflection-input-audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy reflection_input_audio_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'reflection-input-audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy reflection_output_audio_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'reflection-output-audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
