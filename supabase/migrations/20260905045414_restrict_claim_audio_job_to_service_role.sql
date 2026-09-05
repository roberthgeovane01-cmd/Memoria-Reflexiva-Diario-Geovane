-- claim_audio_job é uma primitiva interna chamada só pela Edge Function
-- generate-audio (via service key). Nunca deveria ser invocável por um
-- cliente autenticado ou anônimo direto via PostgREST.
revoke execute on function public.claim_audio_job(uuid, uuid, uuid) from public;
revoke execute on function public.claim_audio_job(uuid, uuid, uuid) from anon;
revoke execute on function public.claim_audio_job(uuid, uuid, uuid) from authenticated;
grant execute on function public.claim_audio_job(uuid, uuid, uuid) to service_role;
