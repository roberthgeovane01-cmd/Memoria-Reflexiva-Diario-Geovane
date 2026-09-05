-- add_post_approval_locks só cobria UPDATE em daily_sources e
-- reflection_comments; como as policies são FOR ALL, DELETE continuava
-- possível depois da aprovação. Generaliza a função para tratar também
-- TG_OP = 'DELETE' (usando OLD.session_id, já que NEW não existe nesse caso)
-- e adiciona os triggers de DELETE. Rascunhos pré-aprovação continuam
-- livremente deletáveis — só bloqueamos quando approved_reflections já
-- existe para a sessão.

create or replace function public.prevent_source_comment_edit_after_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_session_id := old.session_id;
  else
    v_session_id := new.session_id;
  end if;

  if exists (
    select 1 from public.approved_reflections where session_id = v_session_id
  ) then
    raise exception 'session % already approved: % cannot be modified', v_session_id, TG_TABLE_NAME
      using errcode = '23514';
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists daily_sources_lock_delete_after_approval on public.daily_sources;
create trigger daily_sources_lock_delete_after_approval
  before delete on public.daily_sources
  for each row execute function public.prevent_source_comment_edit_after_approval();

drop trigger if exists reflection_comments_lock_delete_after_approval on public.reflection_comments;
create trigger reflection_comments_lock_delete_after_approval
  before delete on public.reflection_comments
  for each row execute function public.prevent_source_comment_edit_after_approval();
