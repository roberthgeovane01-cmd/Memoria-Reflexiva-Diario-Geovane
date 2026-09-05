<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Antes de qualquer alteração

Leia `docs/ESPECIFICACAO.md` — é a especificação oficial do produto, escrita
pelo próprio autor (Geovane). Ela define o princípio central do produto, as
regras de negócio (RN-001 a RN-012, todas obrigatórias) e o mapa de telas.
Trate-a como fonte de verdade acima de qualquer suposição.

## Backend (Supabase)

O projeto Supabase (`dxigfruylgfxnosmogky`) já está totalmente configurado e
conectado ao front-end via `src/integrations/supabase/client.ts` (URL +
publishable key, nunca uma chave secreta). O schema, as políticas de RLS e as
Edge Functions abaixo já estão **publicados em produção**; os arquivos em
`supabase/` são o espelho em código desse estado, para ficarem visíveis aqui
no GitHub — publicar de novo (`supabase db push` / redeploy das functions) é
seguro e idempotente, não deve gerar diffs.

**Migrations** (`supabase/migrations/`): schema completo (perfis, memória
histórica com embeddings/pgvector, sessões diárias, comentários com
áudio+transcrição, gerações versionadas, edições, aprovações, referências de
retrieval, áudio gerado), políticas de RLS por usuário, e a função de busca
semântica `match_historical_reflection_chunks`.

**Edge Functions** (`supabase/functions/`) — todas exigem um usuário
autenticado (`verify_jwt = true`), nunca expõem chaves ao navegador:

- `generate-reflection` — o Motor Reflexivo: lê a fonte + comentário do dia,
  busca reflexões históricas por similaridade semântica (executada pelo
  cliente autenticado do usuário, não pelo admin — `auth.uid()` só resolve
  ali) e gera o texto via OpenAI (`gpt-4o-mini` + `text-embedding-3-small`).
  Bloqueia gerar mais uma versão se a sessão já tiver sido aprovada.
- `transcribe` — transcreve o comentário em áudio via OpenAI.
- `approve-reflection` — aprovação idempotente: `approved_reflections` tem
  `UNIQUE(session_id)`, então uma segunda chamada nunca cria outro registro
  nem sobrescreve a aprovação existente, só a devolve. Marca a geração
  escolhida como `approved` e as demais da sessão como `superseded`.
- `generate-audio` — narra a reflexão aprovada via ElevenLabs e guarda o
  resultado no Storage. Usa `claim_audio_job()` (função Postgres) para
  garantir que só uma invocação por vez chega a chamar o ElevenLabs para o
  mesmo `approved_reflection_id`, mesmo sob concorrência real.

**Máquina de estados de `reflection_sessions`:** `draft` → `processing` →
`review` → `approved` → `audio_processing` → `completed`, com reversão ao
status anterior em qualquer falha recuperável. Depois de `approved`, triggers
no banco (não só RLS) bloqueiam UPDATE em `daily_sources`/
`reflection_comments` e INSERT em `generated_reflections` para aquela sessão.

**Secrets necessários** (Dashboard → Project Settings → Edge Functions →
Secrets, ou `supabase secrets set`) — os valores já estão configurados no
projeto, nunca commitados: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`,
`ELEVENLABS_VOICE_ID`.

**Estado da memória:** 2 reflexões históricas importadas (de 365 planejadas) e
um Perfil Autoral em status `draft` — ambos evoluem conforme mais textos do
autor forem enviados. Ver a especificação completa do produto para o roteiro.
