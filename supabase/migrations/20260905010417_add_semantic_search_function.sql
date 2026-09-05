-- Busca semântica na memória histórica (Seção 10/20 da especificação):
-- compara o embedding da reflexão do dia contra os chunks já indexados,
-- restrito ao próprio usuário via auth.uid().
create or replace function public.match_historical_reflection_chunks(
  query_embedding extensions.vector,
  embedding_model_name text,
  match_count integer default 8,
  match_threshold double precision default 0.0
)
returns table (
  chunk_id uuid,
  reflection_id uuid,
  title text,
  original_date date,
  content text,
  themes text[],
  similarity double precision
)
language sql
stable
set search_path = ''
as $$
  select
    c.id as chunk_id,
    r.id as reflection_id,
    r.title,
    r.original_date,
    c.content,
    r.themes,
    1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.historical_reflection_chunks c
  join public.historical_reflections r on r.id = c.reflection_id
  where c.user_id = (select auth.uid())
    and c.embedding is not null
    and c.embedding_model = embedding_model_name
    and (1 - (c.embedding operator(extensions.<=>) query_embedding)) >= match_threshold
  order by c.embedding operator(extensions.<=>) query_embedding
  limit greatest(1, least(match_count, 20));
$$;
