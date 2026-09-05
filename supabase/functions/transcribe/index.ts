import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

// Transcreve um comentario em audio gravado pelo usuario. So aceita chamadas
// autenticadas (verify_jwt=true na plataforma) - nunca expoe a chave da OpenAI
// ao navegador (RN-012).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return jsonResponse({ error: "openai_not_configured" }, 500);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonResponse({ error: "invalid_form_data" }, 400);
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) return jsonResponse({ error: "missing_audio" }, 400);
  if (audio.size === 0) return jsonResponse({ error: "empty_audio" }, 400);
  if (audio.size > 25 * 1024 * 1024) return jsonResponse({ error: "audio_too_large" }, 413);

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "audio.webm");
  upstream.append("model", "gpt-4o-transcribe");
  upstream.append("language", "pt");

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: upstream,
    });
  } catch (error) {
    console.error("openai_transcription_network_error", error);
    return jsonResponse({ error: "transcription_failed" }, 502);
  }

  if (!res.ok) {
    const detail = await res.text();
    console.error("openai_transcription_failed", res.status, detail);
    return jsonResponse({ error: "transcription_failed" }, 502);
  }

  const data = await res.json();
  const text = typeof data.text === "string" ? data.text.trim() : "";
  if (!text) return jsonResponse({ error: "empty_transcription" }, 502);

  return jsonResponse({ text });
});
