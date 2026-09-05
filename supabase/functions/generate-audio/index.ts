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

type ClaimResult = {
  id: string;
  status: string;
  storage_path: string | null;
  claimed_now: boolean;
};

// So narra texto ja aprovado (RN-007). Falhas aqui nunca apagam a reflexao
// escrita (RN-009) - o job fica marcado como failed e pode ser tentado de
// novo. claim_audio_job (Postgres) garante que so uma invocacao por vez
// chega a chamar o ElevenLabs para o mesmo approved_reflection_id, mesmo sob
// concorrencia real.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const elevenKey = Deno.env.get("ELEVENLABS_API_KEY");
  const voiceId = Deno.env.get("ELEVENLABS_VOICE_ID");
  if (!elevenKey || !voiceId) return jsonResponse({ error: "elevenlabs_not_configured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "missing_authorization" }, 401);

  let body: { approvedReflectionId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  const approvedReflectionId = body.approvedReflectionId;
  if (!approvedReflectionId) return jsonResponse({ error: "missing_approved_reflection_id" }, 400);

  const userClient = createClient(SUPABASE_URL, getPublishableKey(), {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  const admin = createClient(SUPABASE_URL, getSecretKey());

  const { data: approved, error: approvedError } = await admin
    .from("approved_reflections")
    .select("id, session_id, body, user_id")
    .eq("id", approvedReflectionId)
    .maybeSingle();
  if (approvedError || !approved || approved.user_id !== userId) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const { data: claimRows, error: claimError } = await admin.rpc("claim_audio_job", {
    p_approved_reflection_id: approved.id,
    p_session_id: approved.session_id,
    p_user_id: userId,
  });
  if (claimError || !claimRows?.length) {
    console.error("claim_audio_job_failed", claimError);
    return jsonResponse({ error: "job_create_failed" }, 500);
  }
  const claim = claimRows[0] as ClaimResult;

  if (!claim.claimed_now) {
    if (claim.status === "ready" && claim.storage_path) {
      const signed = await admin.storage
        .from("reflection-output-audio")
        .createSignedUrl(claim.storage_path, 3600);
      return jsonResponse({
        id: claim.id,
        storagePath: claim.storage_path,
        url: signed.data?.signedUrl ?? null,
      });
    }
    // Outra invocacao ja esta processando este mesmo audio agora — nao
    // chamamos o ElevenLabs de novo.
    return jsonResponse({ error: "audio_already_processing" }, 409);
  }

  const jobId = claim.id;
  await admin
    .from("reflection_sessions")
    .update({ status: "audio_processing" })
    .eq("id", approved.session_id);

  let ttsRes: Response;
  try {
    ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: approved.body,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
  } catch (error) {
    console.error("elevenlabs_network_error", error);
    await admin
      .from("generated_audio")
      .update({ status: "failed", error_message: "network_error" })
      .eq("id", jobId);
    // Falha e recuperavel: a reflexao aprovada continua intacta (RN-009), a
    // sessao volta a "approved" para permitir nova tentativa de audio.
    await admin
      .from("reflection_sessions")
      .update({ status: "approved" })
      .eq("id", approved.session_id);
    return jsonResponse({ error: "audio_generation_failed" }, 502);
  }

  if (!ttsRes.ok) {
    const detail = await ttsRes.text();
    console.error("elevenlabs_failed", ttsRes.status, detail);
    await admin
      .from("generated_audio")
      .update({ status: "failed", error_message: `elevenlabs_${ttsRes.status}` })
      .eq("id", jobId);
    await admin
      .from("reflection_sessions")
      .update({ status: "approved" })
      .eq("id", approved.session_id);
    return jsonResponse({ error: "audio_generation_failed" }, 502);
  }

  const audioBuffer = new Uint8Array(await ttsRes.arrayBuffer());
  const storagePath = `${userId}/${approved.session_id}/${jobId}.mp3`;

  const { error: uploadError } = await admin.storage
    .from("reflection-output-audio")
    .upload(storagePath, audioBuffer, { contentType: "audio/mpeg", upsert: true });

  if (uploadError) {
    console.error("upload_failed", uploadError);
    await admin
      .from("generated_audio")
      .update({ status: "failed", error_message: "storage_upload_failed" })
      .eq("id", jobId);
    await admin
      .from("reflection_sessions")
      .update({ status: "approved" })
      .eq("id", approved.session_id);
    return jsonResponse({ error: "storage_upload_failed" }, 500);
  }

  await admin
    .from("generated_audio")
    .update({
      status: "ready",
      storage_path: storagePath,
      mime_type: "audio/mpeg",
      error_message: null,
    })
    .eq("id", jobId);

  await admin
    .from("reflection_sessions")
    .update({ status: "completed" })
    .eq("id", approved.session_id);

  const signed = await admin.storage
    .from("reflection-output-audio")
    .createSignedUrl(storagePath, 3600);

  return jsonResponse({ id: jobId, storagePath, url: signed.data?.signedUrl ?? null });
});
