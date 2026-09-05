-- Habilita chamadas HTTP síncronas de dentro do Postgres. Usado para o
-- backfill inicial de embeddings da memória histórica direto via SQL; fica
-- disponível também para futuros backfills pontuais.
create extension if not exists http with schema extensions;
