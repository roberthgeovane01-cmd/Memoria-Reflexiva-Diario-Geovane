-- Uma reflexão aprovada tem no máximo um áudio (a narração pode ser refeita
-- em caso de falha, mas é sempre o mesmo job sendo reprocessado, nunca um
-- job novo). Isso é o que torna possível o claim atômico abaixo.
alter table public.generated_audio
  add constraint generated_audio_approved_reflection_id_key unique (approved_reflection_id);

-- Reivindica atomicamente o direito de processar o TTS de uma reflexão
-- aprovada. Duas invocações concorrentes disputam a mesma linha via
-- INSERT ... ON CONFLICT ... DO UPDATE ... WHERE — o Postgres serializa isso
-- a nível de linha, então só uma consegue transicionar para "processing".
-- claimed_now indica quem venceu a corrida: só essa chamada deve prosseguir
-- para o ElevenLabs.
create or replace function public.claim_audio_job(
  p_approved_reflection_id uuid,
  p_session_id uuid,
  p_user_id uuid
)
returns table (
  id uuid,
  status text,
  storage_path text,
  claimed_now boolean
)
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_status text;
  v_storage_path text;
  v_claimed boolean := false;
begin
  insert into public.generated_audio (approved_reflection_id, session_id, user_id, status)
  values (p_approved_reflection_id, p_session_id, p_user_id, 'processing')
  on conflict (approved_reflection_id) do update
    set status = 'processing', error_message = null, updated_at = now()
    where public.generated_audio.status in ('pending', 'failed')
  returning public.generated_audio.id, public.generated_audio.status, public.generated_audio.storage_path
    into v_id, v_status, v_storage_path;

  if found then
    v_claimed := true;
  else
    select ga.id, ga.status, ga.storage_path
      into v_id, v_status, v_storage_path
      from public.generated_audio ga
      where ga.approved_reflection_id = p_approved_reflection_id;
  end if;

  return query select v_id, v_status, v_storage_path, v_claimed;
end;
$$;
