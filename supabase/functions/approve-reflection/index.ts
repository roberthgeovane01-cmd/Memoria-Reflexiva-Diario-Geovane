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

type ApprovedRow = {
  id: string;
  session_id: string;
  source_generation_id: string | null;
  title: string | null;
  body: string;
  approved_at: string;
};

// RN-006: só uma versão explicitamente aprovada vira a versão final.
// approved_reflections.session_id é UNIQUE — uma segunda chamada de
// aprovação para a mesma sessão nunca cria um segundo registro nem substitui
// o primeiro; ela apenas devolve a aprovação já existente (idempotência real
// via constraint do banco, não apenas checagem no app).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "missing_authorization" }, 401);

  let body: {
    sessionId?: string;
    generatedReflectionId?: string | null;
    title?: string | null;
    body?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  const sessionId = body.sessionId;
  const reflectionBody = (body.body ?? "").trim();
  if (!sessionId) return jsonResponse({ error: "missing_session_id" }, 400);
  if (!reflectionBody) return jsonResponse({ error: "missing_body" }, 400);

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

  if (body.generatedReflectionId) {
    // A geração precisa pertencer ao usuário E à sessão exata sendo aprovada
    // — sem isso seria possível aprovar a sessão A referenciando uma versão
    // gerada para a sessão B do mesmo usuário.
    const { data: generation } = await admin
      .from("generated_reflections")
      .select("id, session_id")
      .eq("id", body.generatedReflectionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!generation || generation.session_id !== sessionId) {
      return jsonResponse({ error: "generation_does_not_belong_to_session" }, 400);
    }
  }

  let approvedRow: ApprovedRow | null = null;

  const { data: inserted, error: insertError } = await admin
    .from("approved_reflections")
    .insert({
      session_id: sessionId,
      user_id: userId,
      source_generation_id: body.generatedReflectionId ?? null,
      title: body.title ?? null,
      body: reflectionBody,
    })
    .select("id, session_id, source_generation_id, title, body, approved_at")
    .single();

  if (insertError) {
    // 23505 = unique_violation em approved_reflections_session_id_key: a
    // sessão já foi aprovada antes (repetição legítima, ex.: duplo clique ou
    // retry de rede). Nunca sobrescrevemos a aprovação existente.
    if (insertError.code === "23505") {
      const { data: existing } = await admin
        .from("approved_reflections")
        .select("id, session_id, source_generation_id, title, body, approved_at")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (!existing) {
        console.error("approve_conflict_without_row", insertError);
        return jsonResponse({ error: "approve_failed" }, 500);
      }
      approvedRow = existing;
    } else {
      console.error("insert_approved_reflection_failed", insertError);
      return jsonResponse({ error: "approve_failed" }, 500);
    }
  } else {
    approvedRow = inserted;
  }

  if (!approvedRow) return jsonResponse({ error: "approve_failed" }, 500);

  // Idempotente por natureza: reaplicar estes updates numa chamada repetida
  // não muda nada (já estão nesse estado).
  if (approvedRow.source_generation_id) {
    await admin
      .from("generated_reflections")
      .update({ status: "approved" })
      .eq("id", approvedRow.source_generation_id);
    await admin
      .from("generated_reflections")
      .update({ status: "superseded" })
      .eq("session_id", sessionId)
      .eq("status", "draft")
      .neq("id", approvedRow.source_generation_id);
  }
  await admin.from("reflection_sessions").update({ status: "approved" }).eq("id", sessionId);

  return jsonResponse({
    id: approvedRow.id,
    sessionId: approvedRow.session_id,
    sourceGenerationId: approvedRow.source_generation_id,
    title: approvedRow.title,
    body: approvedRow.body,
    approvedAt: approvedRow.approved_at,
  });
});
