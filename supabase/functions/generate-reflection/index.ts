import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getPublishableKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}");
    if (keys.default) return keys.default as string;
  } catch {
    /* ignore */
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

function getSecretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    if (keys.default) return keys.default as string;
  } catch {
    /* ignore */
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

type RetrievedChunk = {
  chunk_id: string;
  reflection_id: string;
  title: string | null;
  content: string;
  similarity: number;
  original_date: string | null;
};

// Motor Reflexivo: le a fonte do dia + comentario de Geovane (RLS respeitada
// via o JWT do proprio usuario), consulta a memoria historica por
// similaridade semantica e pede ao modelo uma nova reflexao. Grava o
// resultado com a service key para que o registro de auditoria (RN-004,
// RN-011) nao possa ser forjado pelo cliente.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return jsonResponse({ error: "openai_not_configured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "missing_authorization" }, 401);

  let body: { sessionId?: string; versionNumber?: number };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  const sessionId = body.sessionId;
  const versionNumber = Number.isFinite(body.versionNumber) ? Number(body.versionNumber) : 1;
  if (!sessionId) return jsonResponse({ error: "missing_session_id" }, 400);

  const userClient = createClient(SUPABASE_URL, getPublishableKey(), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  const admin = createClient(SUPABASE_URL, getSecretKey());

  const { data: session, error: sessionError } = await admin
    .from("reflection_sessions")
    .select("id, user_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionError || !session || session.user_id !== userId) {
    return jsonResponse({ error: "session_not_found" }, 404);
  }

  const [sourceRes, commentRes, authorProfileRes] = await Promise.all([
    admin
      .from("daily_sources")
      .select("raw_text, source_author, title")
      .eq("session_id", sessionId)
      .maybeSingle(),
    admin
      .from("reflection_comments")
      .select("text_comment, transcript_edited")
      .eq("session_id", sessionId)
      .maybeSingle(),
    admin
      .from("author_profiles")
      .select("style_summary")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const source = sourceRes.data;
  if (!source?.raw_text) return jsonResponse({ error: "missing_source" }, 400);

  const comment = commentRes.data;
  const commentText = (comment?.transcript_edited || comment?.text_comment || "").trim();
  if (!commentText) return jsonResponse({ error: "missing_comment" }, 400);

  const styleSummary = authorProfileRes.data?.style_summary?.trim();

  let retrieved: RetrievedChunk[] = [];
  try {
    const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: `${source.raw_text}\n\n${commentText}`,
      }),
    });
    if (embeddingRes.ok) {
      const embeddingJson = await embeddingRes.json();
      const queryEmbedding = embeddingJson.data?.[0]?.embedding;
      if (Array.isArray(queryEmbedding)) {
        const { data: matches, error: matchError } = await admin.rpc(
          "match_historical_reflection_chunks",
          {
            query_embedding: JSON.stringify(queryEmbedding),
            embedding_model_name: "text-embedding-3-small",
            match_count: 5,
            match_threshold: 0.5,
          },
        );
        if (matchError) console.error("semantic_search_failed", matchError);
        retrieved = (matches ?? []) as RetrievedChunk[];
      }
    } else {
      console.error("openai_embedding_failed", embeddingRes.status, await embeddingRes.text());
    }
  } catch (error) {
    // A memoria historica ainda pode estar vazia (nenhuma reflexao importada) -
    // isso nunca deve impedir a geracao a partir da fonte + comentario.
    console.error("retrieval_failed", error);
  }

  const memoryBlock = retrieved.length
    ? retrieved.map((r, i) => `(${i + 1}) "${r.title ?? "Sem titulo"}": ${r.content}`).join("\n\n")
    : "Nenhuma reflexao historica disponivel ainda - escreva a partir da fonte e do comentario.";

  const systemPrompt = [
    "Voce e o Motor Reflexivo de um aplicativo privado chamado Memoria Reflexiva.",
    "Sua tarefa e redigir, em portugues do Brasil, uma reflexao diaria autoral para o usuario Geovane,",
    "a partir de uma reflexao-fonte recebida e do comentario pessoal dele.",
    "Regras inegociaveis:",
    "- Priorize o que Geovane quis dizer no comentario; a fonte e ponto de partida, nao o conteudo a copiar.",
    "- Nunca copie trechos literais da fonte ou da memoria historica; escreva com originalidade.",
    "- Nunca invente fatos, citacoes ou afirmacoes que Geovane nao sugeriu.",
    "- Tom contemplativo e pessoal, com comeco, desenvolvimento e conclusao - nunca como um artigo generico de blog.",
    "- Nao mencione IA, modelos, prompts ou tecnologia dentro da reflexao.",
    styleSummary
      ? `Estilo autoral de Geovane, ja identificado: ${styleSummary}`
      : "Ainda nao existe um perfil autoral definido - escreva em tom sobrio e reflexivo, evitando cliches.",
    'Responda somente em JSON: {"title": string, "body": string} - body com paragrafos separados por linha em branco dupla.',
  ].join("\n");

  const userPrompt = [
    `Reflexao recebida hoje:\n${source.raw_text}`,
    source.source_author ? `Fonte/autor: ${source.source_author}` : "",
    `Comentario pessoal de Geovane:\n${commentText}`,
    `Reflexoes historicas relacionadas (para inspirar tema e tom, nunca copiar):\n${memoryBlock}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const MODEL_NAME = "gpt-4o-mini";
  let completionRes: Response;
  try {
    completionRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        response_format: { type: "json_object" },
        temperature: 0.8,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  } catch (error) {
    console.error("openai_completion_network_error", error);
    return jsonResponse({ error: "generation_failed" }, 502);
  }

  if (!completionRes.ok) {
    console.error("openai_completion_failed", completionRes.status, await completionRes.text());
    return jsonResponse({ error: "generation_failed" }, 502);
  }

  const completionJson = await completionRes.json();
  const raw = completionJson.choices?.[0]?.message?.content ?? "{}";
  let parsed: { title?: string; body?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("invalid_model_output", raw);
    return jsonResponse({ error: "invalid_model_output" }, 502);
  }

  const title = (parsed.title ?? "Reflexao de hoje").trim();
  const generatedBody = (parsed.body ?? "").trim();
  if (!generatedBody) return jsonResponse({ error: "empty_generation" }, 502);

  const { data: inserted, error: insertError } = await admin
    .from("generated_reflections")
    .insert({
      user_id: userId,
      session_id: sessionId,
      version_number: versionNumber,
      title,
      body: generatedBody,
      model_provider: "openai",
      model_name: MODEL_NAME,
      prompt_version: "v1",
      input_snapshot: { source: source.raw_text, comment: commentText },
      generation_metadata: {
        usage: completionJson.usage ?? null,
        retrieved_count: retrieved.length,
      },
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("insert_generated_reflection_failed", insertError);
    return jsonResponse({ error: "save_failed" }, 500);
  }

  if (retrieved.length) {
    const rows = retrieved.map((r, i) => ({
      user_id: userId,
      generated_reflection_id: inserted.id,
      historical_reflection_id: r.reflection_id,
      chunk_id: r.chunk_id,
      rank: i + 1,
      similarity: r.similarity,
      reference_title_snapshot: r.title,
      reference_text_snapshot: r.content,
    }));
    const { error: refError } = await admin.from("retrieval_references").insert(rows);
    if (refError) console.error("insert_retrieval_references_failed", refError);
  }

  return jsonResponse({ id: inserted.id, title, body: generatedBody });
});
