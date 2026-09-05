import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import {
  addDemoApproved,
  demoSessionId,
  isDemoActive,
  listDemoApproved,
  listDemoHistorical,
} from "@/lib/demo";

/**
 * Acesso a dados do fluxo diário. Tudo passa pelo cliente publishable e pelas
 * políticas de RLS já configuradas no banco — nenhuma chave secreta aqui.
 * Quando uma política não permitir uma escrita, a função devolve null e o
 * fluxo segue com estado local (ver comentários "futuro backend").
 */

export type ReflectionSession = { id: string; reflection_date: string; status: string | null };

export type ApprovedReflection = {
  id: string;
  title: string | null;
  body: string | null;
  approved_at: string | null;
};

export type HistoricalReflection = {
  id: string;
  title: string | null;
  summary: string | null;
  body: string | null;
  original_date: string | null;
};

export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function fail(scope: string, error: unknown) {
  // Log técnico apenas no console; a interface mostra texto humano.
  console.warn(`[dados] ${scope}`, error);
  return null;
}

/** Cria (ou recupera) a sessão de reflexão do dia. */
export async function ensureTodaySession(userId: string): Promise<ReflectionSession | null> {
  const date = todayISO();
  // Modo de teste: sessão puramente local, nada é enviado ao servidor.
  if (isDemoActive()) return { id: demoSessionId(), reflection_date: date, status: null };
  const existing = await supabase
    .from("reflection_sessions")
    .select("id, reflection_date, status")
    .eq("user_id", userId)
    .eq("reflection_date", date)
    .maybeSingle();
  if (existing.data) return existing.data as ReflectionSession;
  if (existing.error) return fail("ensureTodaySession/select", existing.error);

  const created = await supabase
    .from("reflection_sessions")
    .insert({ user_id: userId, reflection_date: date })
    .select("id, reflection_date, status")
    .maybeSingle();
  if (created.error) return fail("ensureTodaySession/insert", created.error);
  return (created.data as ReflectionSession) ?? null;
}

export type SessionContent = {
  source: { raw_text: string | null; source_author: string | null; title: string | null } | null;
  comment: {
    input_mode: string | null;
    text_comment: string | null;
    transcript_edited: string | null;
    audio_storage_path: string | null;
  } | null;
};

export async function loadSessionContent(sessionId: string): Promise<SessionContent> {
  if (isDemoActive()) return { source: null, comment: null };
  const [source, comment] = await Promise.all([
    supabase
      .from("daily_sources")
      .select("raw_text, source_author, title")
      .eq("session_id", sessionId)
      .maybeSingle(),
    supabase
      .from("reflection_comments")
      .select("input_mode, text_comment, transcript_edited, audio_storage_path")
      .eq("session_id", sessionId)
      .maybeSingle(),
  ]);
  return {
    source: (source.data as SessionContent["source"]) ?? null,
    comment: (comment.data as SessionContent["comment"]) ?? null,
  };
}

export async function saveSource(args: {
  userId: string;
  sessionId: string;
  rawText: string;
  sourceAuthor: string | null;
}) {
  if (isDemoActive()) return true;
  const existing = await supabase
    .from("daily_sources")
    .select("id")
    .eq("session_id", args.sessionId)
    .maybeSingle();

  const payload = {
    user_id: args.userId,
    session_id: args.sessionId,
    raw_text: args.rawText,
    source_author: args.sourceAuthor,
  };

  const res = existing.data?.id
    ? await supabase.from("daily_sources").update(payload).eq("id", existing.data.id)
    : await supabase.from("daily_sources").insert(payload);

  if (res.error) return fail("saveSource", res.error);
  return true;
}

export async function uploadCommentAudio(args: {
  userId: string;
  sessionId: string;
  blob: Blob;
  mimeType: string;
}) {
  if (isDemoActive()) return null;
  const ext = args.mimeType.includes("mp4")
    ? "m4a"
    : args.mimeType.includes("ogg")
      ? "ogg"
      : args.mimeType.includes("mpeg")
        ? "mp3"
        : "webm";
  const path = `${args.userId}/${args.sessionId}/comment-${Date.now()}.${ext}`;
  const res = await supabase.storage
    .from("reflection-input-audio")
    .upload(path, args.blob, { contentType: args.mimeType, upsert: false });
  if (res.error) return fail("uploadCommentAudio", res.error);
  return path;
}

export async function saveComment(args: {
  userId: string;
  sessionId: string;
  inputMode: "write" | "speak";
  textComment: string | null;
  transcriptEdited: string | null;
  audioStoragePath?: string | null;
  audioMimeType?: string | null;
  audioDurationSeconds?: number | null;
}) {
  if (isDemoActive()) return true;
  const existing = await supabase
    .from("reflection_comments")
    .select("id")
    .eq("session_id", args.sessionId)
    .maybeSingle();

  // A coluna aceita "text" | "audio" | "mixed" (RN da seção 6); o fluxo do
  // app fala em "write" | "speak" — traduzimos aqui, na borda com o banco.
  const payload: TablesInsert<"reflection_comments"> = {
    user_id: args.userId,
    session_id: args.sessionId,
    input_mode: args.inputMode === "speak" ? "audio" : "text",
    text_comment: args.textComment,
    transcript_edited: args.transcriptEdited,
  };
  if (args.audioStoragePath) {
    payload.audio_storage_path = args.audioStoragePath;
    payload.audio_mime_type = args.audioMimeType ?? null;
    payload.audio_duration_seconds = args.audioDurationSeconds ?? null;
  }

  const res = existing.data?.id
    ? await supabase.from("reflection_comments").update(payload).eq("id", existing.data.id)
    : await supabase.from("reflection_comments").insert(payload);

  if (res.error) return fail("saveComment", res.error);
  return true;
}

/** Edição de uma versão gerada — só registra quando existe a versão no banco. */
export async function saveEdit(args: {
  userId: string;
  sessionId: string;
  generatedReflectionId: string | null;
  title: string;
  body: string;
}) {
  if (isDemoActive()) return true;
  if (!args.generatedReflectionId) return null; // futuro backend
  const res = await supabase.from("reflection_edits").insert({
    user_id: args.userId,
    session_id: args.sessionId,
    generated_reflection_id: args.generatedReflectionId,
    title: args.title,
    body: args.body,
  });
  if (res.error) return fail("saveEdit", res.error);
  return true;
}

export async function approveReflection(args: {
  userId: string;
  sessionId: string;
  sourceGenerationId: string | null;
  title: string;
  body: string;
}) {
  if (isDemoActive()) return addDemoApproved({ title: args.title, body: args.body });
  const res = await supabase
    .from("approved_reflections")
    .insert({
      user_id: args.userId,
      session_id: args.sessionId,
      source_generation_id: args.sourceGenerationId,
      title: args.title,
      body: args.body,
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  if (res.error) return fail("approveReflection", res.error);
  await supabase
    .from("reflection_sessions")
    .update({ status: "approved" })
    .eq("id", args.sessionId);
  return (res.data?.id as string | undefined) ?? null;
}

export async function listApproved(userId: string): Promise<ApprovedReflection[]> {
  if (isDemoActive()) return listDemoApproved();
  const res = await supabase
    .from("approved_reflections")
    .select("id, title, body, approved_at")
    .eq("user_id", userId)
    .order("approved_at", { ascending: false });
  if (res.error) {
    fail("listApproved", res.error);
    return [];
  }
  return (res.data as ApprovedReflection[]) ?? [];
}

export async function listHistorical(userId: string): Promise<HistoricalReflection[]> {
  if (isDemoActive()) return listDemoHistorical();
  const res = await supabase
    .from("historical_reflections")
    .select("id, title, summary, body, original_date")
    .eq("user_id", userId)
    .order("original_date", { ascending: false });
  if (res.error) {
    fail("listHistorical", res.error);
    return [];
  }
  return (res.data as HistoricalReflection[]) ?? [];
}

export function excerptOf(text: string | null, max = 160) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}
