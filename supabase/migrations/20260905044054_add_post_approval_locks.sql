-- RN-006: uma vez que existe approved_reflections para uma sessão, a fonte, o
-- comentário e as gerações que a originaram são fato consumado. Defesa no
-- banco (não só no front-end): qualquer tentativa de UPDATE em daily_sources
-- /reflection_comments, ou de INSERT em generated_reflections, para uma
-- sessão já aprovada, falha explicitamente — independentemente de vir do
-- cliente (RLS) ou de uma Edge Function com service key (que ignora RLS mas
-- não ignora triggers).

create or replace function public.prevent_source_comment_edit_after_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.approved_reflections where session_id = new.session_id
  ) then
    raise exception 'session % already approved: % cannot be modified', new.session_id, TG_TABLE_NAME
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists daily_sources_lock_after_approval on public.daily_sources;
create trigger daily_sources_lock_after_approval
  before update on public.daily_sources
  for each row execute function public.prevent_source_comment_edit_after_approval();

drop trigger if exists reflection_comments_lock_after_approval on public.reflection_comments;
create trigger reflection_comments_lock_after_approval
  before update on public.reflection_comments
  for each row execute function public.prevent_source_comment_edit_after_approval();

create or replace function public.prevent_generation_after_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.approved_reflections where session_id = new.session_id
  ) then
    raise exception 'session % already approved: cannot create new generated_reflections', new.session_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists generated_reflections_lock_after_approval on public.generated_reflections;
create trigger generated_reflections_lock_after_approval
  before insert on public.generated_reflections
  for each row execute function public.prevent_generation_after_approval();
