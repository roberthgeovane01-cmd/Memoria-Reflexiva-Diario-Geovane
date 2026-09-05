import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Home,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Stepper, type StepKey } from "@/components/Stepper";
import { VoiceRecorder, type RecordingResult } from "@/components/VoiceRecorder";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import {
  approveReflection,
  ensureTodaySession,
  loadSessionContent,
  saveComment,
  saveEdit,
  saveSource,
  uploadCommentAudio,
} from "@/lib/db";
import { isDemoActive } from "@/lib/demo";
import { capitalize, longDate } from "@/lib/format";
import { sampleReceived, sampleTranscript, versionOne, versionTwo } from "@/lib/reflections";
import { useDraft, type Draft } from "@/lib/useDraft";

function splitParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

type GenerationResult = {
  ok: boolean;
  id: string | null;
  content: { title: string; paragraphs: string[] } | null;
};

export const Route = createFileRoute("/_authenticated/criar")({
  head: () => ({
    meta: [
      { title: "Nova reflexão — Memória Reflexiva" },
      {
        name: "description",
        content:
          "Da fonte recebida ao áudio final: escreva, revise e aprove a reflexão do dia em poucos passos.",
      },
      { property: "og:title", content: "Nova reflexão — Memória Reflexiva" },
      {
        property: "og:description",
        content: "Fonte, comentário, revisão e narração em um único fluxo tranquilo.",
      },
    ],
  }),
  component: CreateFlow,
});

const stepperKey: Record<Draft["step"], StepKey> = {
  source: "source",
  comment: "comment",
  processing: "comment",
  review: "review",
  audio: "audio",
};

function CreateFlow() {
  const { user } = useSession();
  const { draft, update, reset, hydrated, savedAt } = useDraft(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [recording, setRecording] = useState<RecordingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const bootstrapped = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Abre (ou recupera) a sessão do dia e traz o que já estava salvo no servidor.
  useEffect(() => {
    if (!hydrated || !user || bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      const session = await ensureTodaySession(user.id);
      if (!session) {
        toast("Não conseguimos abrir a reflexão de hoje. Seu texto fica guardado neste navegador.");
        return;
      }
      const current = draftRef.current;
      const patch: Partial<Draft> = { sessionId: session.id };
      if (current.sessionId && current.sessionId !== session.id) {
        // Rascunho de outro dia: começa limpo.
        Object.assign(patch, {
          received: "",
          source: "",
          comment: "",
          transcript: "",
          step: "source" as Draft["step"],
          version: 1 as const,
          editedV1: null,
          editedV2: null,
          approved: false,
          generationV1Id: null,
          generationV2Id: null,
          generatedV1: null,
          generatedV2: null,
          approvedReflectionId: null,
        });
      }
      const content = await loadSessionContent(session.id);
      if (content.source?.raw_text && !current.received) {
        patch.received = content.source.raw_text;
        patch.source = content.source.source_author ?? "";
      }
      if (content.comment) {
        if (content.comment.input_mode === "speak" || content.comment.input_mode === "write") {
          patch.mode = content.comment.input_mode;
        }
        if (!current.comment && content.comment.text_comment) {
          patch.comment = content.comment.text_comment;
        }
        if (!current.transcript && content.comment.transcript_edited) {
          patch.transcript = content.comment.transcript_edited;
        }
      }
      update(patch);
    })();
  }, [hydrated, user, update]);

  const sessionId = draft.sessionId;

  function warnNotSaved() {
    toast("Não conseguimos guardar agora", {
      description: "Seu texto continua neste navegador. Tente novamente em instantes.",
    });
  }

  async function goToComment() {
    if (!user || !sessionId) {
      update({ step: "comment" });
      return;
    }
    setBusy(true);
    const ok = await saveSource({
      userId: user.id,
      sessionId,
      rawText: draft.received.trim(),
      sourceAuthor: draft.source.trim() || null,
    });
    setBusy(false);
    if (!ok) warnNotSaved();
    update({ step: "comment" });
  }

  async function goToProcessing() {
    if (!user || !sessionId) {
      update({ step: "processing" });
      return;
    }
    setBusy(true);
    let audioPath: string | null = null;
    if (draft.mode === "speak" && recording) {
      audioPath = await uploadCommentAudio({
        userId: user.id,
        sessionId,
        blob: recording.blob,
        mimeType: recording.mimeType,
      });
      if (!audioPath) toast("O áudio não pôde ser guardado, mas seu texto segue normalmente.");
    }
    const ok = await saveComment({
      userId: user.id,
      sessionId,
      inputMode: draft.mode,
      textComment: draft.mode === "write" ? draft.comment.trim() : null,
      transcriptEdited: draft.mode === "speak" ? draft.transcript.trim() : null,
      audioStoragePath: audioPath,
      audioMimeType: audioPath ? (recording?.mimeType ?? null) : null,
      audioDurationSeconds: audioPath ? (recording?.seconds ?? null) : null,
    });
    setBusy(false);
    if (!ok) warnNotSaved();
    update({ step: "processing" });
  }

  // Pede ao Motor Reflexivo (Edge Function generate-reflection) uma nova versão.
  // No modo de teste, nada sai do navegador — usamos os textos de exemplo.
  async function registerVersion(version: 1 | 2): Promise<GenerationResult> {
    if (!user || !sessionId) return { ok: false, id: null, content: null };

    if (isDemoActive()) {
      const base = version === 1 ? versionOne : versionTwo;
      update(version === 1 ? { generatedV1: base } : { generatedV2: base });
      return { ok: true, id: null, content: base };
    }

    const { data, error } = await supabase.functions.invoke<{
      id: string;
      title: string;
      body: string;
    }>("generate-reflection", { body: { sessionId, versionNumber: version } });

    if (error || !data?.body) {
      console.warn("[reflexao] generate-reflection", error);
      return { ok: false, id: null, content: null };
    }

    const content = { title: data.title, paragraphs: splitParagraphs(data.body) };
    update(
      version === 1
        ? { generatedV1: content, generationV1Id: data.id }
        : { generatedV2: content, generationV2Id: data.id },
    );
    return { ok: true, id: data.id, content };
  }

  const [genState, setGenState] = useState<"idle" | "running" | "error">("idle");
  const processingStarted = useRef(false);

  async function runGeneration() {
    setGenState("running");
    const minDelay = new Promise((resolve) => setTimeout(resolve, messages.length * 1100));
    const [result] = await Promise.all([registerVersion(1), minDelay]);
    if (!result.ok) {
      setGenState("error");
      return;
    }
    setGenState("idle");
    update({ step: "review", generationV1Id: result.id ?? draft.generationV1Id });
  }

  useEffect(() => {
    if (draft.step === "processing" && !processingStarted.current) {
      processingStarted.current = true;
      void runGeneration();
    }
    if (draft.step !== "processing") processingStarted.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.step]);

  if (!hydrated) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Abrindo sua mesa de trabalho…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <Stepper current={stepperKey[draft.step]} />

        <div className="mt-8">
          {draft.step === "source" && (
            <SourceStep
              draft={draft}
              update={update}
              savedAt={savedAt}
              busy={busy}
              onContinue={goToComment}
              onBack={() => navigate({ to: "/" })}
            />
          )}
          {draft.step === "comment" && (
            <CommentStep
              draft={draft}
              update={update}
              savedAt={savedAt}
              busy={busy}
              onRecording={setRecording}
              onContinue={goToProcessing}
              onBack={() => update({ step: "source" })}
            />
          )}
          {draft.step === "processing" &&
            (genState === "error" ? (
              <ProcessingError
                onRetry={() => void runGeneration()}
                onBack={() => update({ step: "comment" })}
              />
            ) : (
              <Processing />
            ))}
          {draft.step === "review" && (
            <ReviewStep
              draft={draft}
              update={update}
              userId={user?.id ?? null}
              onCreateVersionTwo={registerVersion}
              onApproved={() => queryClient.invalidateQueries({ queryKey: ["approved"] })}
            />
          )}
          {draft.step === "audio" && (
            <AudioReady
              approvedReflectionId={draft.approvedReflectionId}
              demoAudioUrl={recording?.url ?? null}
              title={
                (draft.version === 1 ? draft.generatedV1 : draft.generatedV2)?.title ??
                "Reflexão de hoje"
              }
              onRestart={() => {
                reset();
                navigate({ to: "/" });
              }}
              onSeeText={() => update({ step: "review" })}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function SavedHint({ savedAt }: { savedAt: number | null }) {
  return (
    <p aria-live="polite" className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Check className="size-3.5 text-primary" aria-hidden="true" />
      {savedAt ? "Salvo automaticamente" : "As alterações são guardadas enquanto você escreve"}
    </p>
  );
}

type StepProps = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  savedAt: number | null;
  busy: boolean;
};

function SourceStep({
  draft,
  update,
  savedAt,
  busy,
  onBack,
  onContinue,
}: StepProps & { onBack: () => void; onContinue: () => void }) {
  return (
    <section className="card-soft relative overflow-hidden p-6 sm:p-9">
      <h1 className="font-display text-2xl font-bold sm:text-[32px]">O que você recebeu hoje?</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Cole abaixo a reflexão que será usada como ponto de partida.
      </p>

      <div className="mt-7 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="recebida" className="text-sm font-medium">
            Reflexão recebida
          </Label>
          {!draft.received && (
            <button
              type="button"
              onClick={() => {
                update({ received: sampleReceived });
                toast("Exemplo inserido");
              }}
              className="rounded-md text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Usar um exemplo
            </button>
          )}
        </div>
        <Textarea
          id="recebida"
          value={draft.received}
          onChange={(e) => update({ received: e.target.value })}
          placeholder={sampleReceived}
          className="min-h-56 resize-y rounded-md bg-card p-4 text-base leading-relaxed"
        />
        <SavedHint savedAt={savedAt} />
      </div>

      <div className="mt-6 space-y-2">
        <Label htmlFor="fonte" className="text-sm font-medium">
          Fonte ou autor <span className="text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id="fonte"
          value={draft.source}
          onChange={(e) => update({ source: e.target.value })}
          placeholder="Livro, conversa, anotação…"
          className="h-12 text-base"
        />
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="h-12 sm:w-auto">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Hoje
        </Button>
        <Button
          size="lg"
          className="h-12 w-full text-base sm:w-auto"
          disabled={draft.received.trim().length < 10 || busy}
          onClick={onContinue}
        >
          {busy ? "Guardando…" : "Continuar"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
      {draft.received.trim().length < 10 && (
        <p className="mt-3 text-right text-xs text-muted-foreground">
          Escreva um pouco mais para continuar.
        </p>
      )}
    </section>
  );
}

function CommentStep({
  draft,
  update,
  savedAt,
  busy,
  onBack,
  onContinue,
  onRecording,
}: StepProps & {
  onBack: () => void;
  onContinue: () => void;
  onRecording: (r: RecordingResult | null) => void;
}) {
  const canContinue =
    draft.mode === "write" ? draft.comment.trim().length > 4 : draft.transcript.trim().length > 4;
  const [transcribing, setTranscribing] = useState(false);

  async function handleRecording(result: RecordingResult | null) {
    onRecording(result);
    if (!result) return;

    if (isDemoActive()) {
      if (!draft.transcript) update({ transcript: sampleTranscript });
      toast("Texto da fala pronto para revisão");
      return;
    }

    setTranscribing(true);
    const form = new FormData();
    form.append(
      "audio",
      result.blob,
      result.mimeType.includes("mp4") ? "comentario.m4a" : "comentario.webm",
    );
    const { data, error } = await supabase.functions.invoke<{ text: string }>("transcribe", {
      body: form,
    });
    setTranscribing(false);

    if (error || !data?.text) {
      toast("Não conseguimos transcrever agora", {
        description: "Você pode escrever seu comentário diretamente aqui embaixo.",
      });
      return;
    }
    update({ transcript: data.text });
    toast("Texto da fala pronto para revisão");
  }

  return (
    <section className="card-soft p-6 sm:p-9">
      <h1 className="font-display text-2xl font-bold sm:text-[32px]">
        O que essa reflexão despertou em você?
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Fale ou escreva livremente. Não precisa organizar o texto.
      </p>

      <div
        role="tablist"
        aria-label="Forma de registrar"
        className="mt-7 grid grid-cols-2 gap-1 rounded-md border border-border bg-secondary p-1"
      >
        {(["write", "speak"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={draft.mode === m}
            onClick={() => update({ mode: m })}
            className={
              draft.mode === m
                ? "min-h-11 rounded-[6px] bg-primary text-sm font-semibold text-primary-foreground"
                : "min-h-11 rounded-[6px] text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            }
          >
            {m === "write" ? "Escrever" : "Falar"}
          </button>
        ))}
      </div>

      {draft.mode === "write" ? (
        <div className="mt-6 space-y-2">
          <Label htmlFor="comentario" className="text-sm font-medium">
            Seu comentário
          </Label>
          <Textarea
            id="comentario"
            value={draft.comment}
            onChange={(e) => update({ comment: e.target.value })}
            placeholder="O que te chamou atenção? O que isso mexeu?"
            className="min-h-56 resize-y rounded-md bg-card p-4 text-base leading-relaxed"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Não se preocupe em escrever bonito. A ideia é registrar o que você pensa.
          </p>
          <SavedHint savedAt={savedAt} />
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <VoiceRecorder onFinished={(result) => void handleRecording(result)} />
          {transcribing && (
            <p aria-live="polite" className="text-sm text-muted-foreground">
              Transcrevendo sua fala…
            </p>
          )}
          {draft.transcript && (
            <div className="space-y-2">
              <Label htmlFor="transcricao" className="text-sm font-medium">
                Texto da sua fala
              </Label>
              <Textarea
                id="transcricao"
                value={draft.transcript}
                onChange={(e) => update({ transcript: e.target.value })}
                className="min-h-44 resize-y rounded-md bg-card p-4 text-base leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                Você pode corrigir a transcrição antes de continuar.
              </p>
              <SavedHint savedAt={savedAt} />
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onBack} className="h-12 sm:w-auto">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar
        </Button>
        <Button
          size="lg"
          className="h-12 w-full text-base sm:w-auto"
          disabled={!canContinue || busy || transcribing}
          onClick={onContinue}
        >
          {busy ? "Guardando…" : "Criar minha reflexão"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
      {!canContinue && (
        <p className="mt-3 text-right text-xs text-muted-foreground">
          {draft.mode === "write"
            ? "Escreva algumas palavras para continuar."
            : "Grave ou ajuste o texto da sua fala para continuar."}
        </p>
      )}
    </section>
  );
}

const messages = [
  "Compreendendo a reflexão…",
  "Consultando sua memória…",
  "Organizando suas ideias…",
  "Preparando o texto…",
];

function Processing() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="card-soft flex min-h-[380px] flex-col items-center justify-center p-10 text-center">
      <p className="eyebrow">Preparando</p>
      <p
        aria-live="polite"
        className="mt-4 font-display text-xl font-bold text-primary sm:text-2xl"
      >
        {messages[index]}
      </p>
      <div className="mt-8 h-[3px] w-64 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${((index + 1) / messages.length) * 100}%` }}
        />
      </div>
    </section>
  );
}

function ProcessingError({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <section className="card-soft flex min-h-[380px] flex-col items-center justify-center gap-4 p-10 text-center">
      <p className="eyebrow">Não foi dessa vez</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        Não conseguimos preparar sua reflexão agora. Seu texto e seu comentário continuam guardados
        — você pode tentar de novo.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="ghost" onClick={onBack} className="h-12">
          Voltar
        </Button>
        <Button onClick={onRetry} className="h-12">
          Tentar novamente
        </Button>
      </div>
    </section>
  );
}

function ReviewStep({
  draft,
  update,
  userId,
  onCreateVersionTwo,
  onApproved,
}: {
  draft: Draft;
  update: (p: Partial<Draft>) => void;
  userId: string | null;
  onCreateVersionTwo: (version: 1 | 2) => Promise<GenerationResult>;
  onApproved: () => void;
}) {
  const generated = draft.version === 1 ? draft.generatedV1 : draft.generatedV2;
  const base = generated ?? (draft.version === 1 ? versionOne : versionTwo);
  const edited = draft.version === 1 ? draft.editedV1 : draft.editedV2;
  const paragraphs = edited ?? base.paragraphs;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(paragraphs.join("\n\n"));
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    setText((edited ?? base.paragraphs).join("\n\n"));
    setEditing(false);
  }, [draft.version, edited, base.paragraphs]);

  const generationId = draft.version === 1 ? draft.generationV1Id : draft.generationV2Id;

  async function save() {
    const next = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    update(draft.version === 1 ? { editedV1: next } : { editedV2: next });
    setEditing(false);
    toast("Alterações salvas");
    if (userId && draft.sessionId) {
      // Registrado apenas quando existe a versão gerada no servidor.
      await saveEdit({
        userId,
        sessionId: draft.sessionId,
        generatedReflectionId: generationId,
        title: base.title,
        body: next.join("\n\n"),
      });
    }
  }

  async function approve() {
    setApproving(true);
    let approvedId: string | null = null;
    if (userId && draft.sessionId) {
      approvedId = await approveReflection({
        userId,
        sessionId: draft.sessionId,
        sourceGenerationId: generationId,
        title: base.title,
        body: paragraphs.join("\n\n"),
      });
      if (!approvedId) {
        setApproving(false);
        toast("Não conseguimos guardar a aprovação agora", {
          description: "Seu texto continua aqui. Tente novamente em instantes.",
        });
        return;
      }
      onApproved();
    }
    setApproving(false);
    update({ step: "audio", approved: true, approvedReflectionId: approvedId });
    toast("Reflexão aprovada");
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-[32px]">Sua reflexão</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Criada a partir da reflexão de hoje e do seu comentário.
        </p>
      </header>

      <article className="card-soft mx-auto w-full max-w-[760px] p-6 sm:p-12">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[5px] bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Versão {draft.version}
          </span>
          {draft.version === 2 && (
            <button
              type="button"
              onClick={() => update({ version: 1 })}
              className="rounded-md text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Ver versão 1
            </button>
          )}
          {draft.version === 1 && draft.editedV2 !== null && (
            <button
              type="button"
              onClick={() => update({ version: 2 })}
              className="rounded-md text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Ver versão 2
            </button>
          )}
        </div>

        <h2 className="mt-5 font-display text-2xl font-bold leading-snug text-primary sm:text-[32px]">
          {base.title}
        </h2>

        {editing ? (
          <div className="mt-5 space-y-3">
            <Label htmlFor="editor" className="text-sm font-medium">
              Texto da reflexão
            </Label>
            <Textarea
              id="editor"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-80 resize-y rounded-md bg-card p-4 font-display text-base leading-loose"
            />
            <p className="text-xs text-muted-foreground">
              Separe os parágrafos com uma linha em branco.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="ghost" className="h-11" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button className="h-11" onClick={() => void save()}>
                <Check className="size-4" aria-hidden="true" />
                Salvar alterações
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose-reflection mt-6">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </article>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="h-12 text-primary">
                <RefreshCw className="size-4" aria-hidden="true" />
                Gerar outra versão
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Criar uma segunda versão?</AlertDialogTitle>
                <AlertDialogDescription>
                  A versão atual continua guardada e você pode voltar para ela quando quiser.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="min-h-11"
                  onClick={async () => {
                    const result = draft.generationV2Id
                      ? { ok: true, id: draft.generationV2Id, content: draft.generatedV2 }
                      : await onCreateVersionTwo(2);
                    if (!result.ok) {
                      toast("Não conseguimos gerar uma nova versão agora", {
                        description: "Tente novamente em instantes.",
                      });
                      return;
                    }
                    update({
                      version: 2,
                      editedV2:
                        draft.editedV2 ?? result.content?.paragraphs ?? versionTwo.paragraphs,
                      generationV2Id: result.id ?? draft.generationV2Id,
                    });
                    toast("Versão 2 criada");
                  }}
                >
                  Criar versão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" className="h-12" onClick={() => setEditing(true)}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Button>
        </div>

        <Button
          size="lg"
          className="h-12 w-full text-base sm:w-auto"
          disabled={approving}
          onClick={() => void approve()}
        >
          {approving ? "Guardando…" : "Aprovar reflexão"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}

function AudioReady({
  approvedReflectionId,
  demoAudioUrl,
  title,
  onRestart,
  onSeeText,
}: {
  approvedReflectionId: string | null;
  demoAudioUrl: string | null;
  title: string;
  onRestart: () => void;
  onSeeText: () => void;
}) {
  const skipNetwork = isDemoActive() || !approvedReflectionId;
  const [state, setState] = useState<"loading" | "ready" | "error">(
    skipNetwork ? "ready" : "loading",
  );
  const [url, setUrl] = useState<string | null>(demoAudioUrl);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (skipNetwork) return;
    let active = true;
    setState("loading");
    supabase.functions
      .invoke<{ url: string | null }>("generate-audio", { body: { approvedReflectionId } })
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.url) {
          setState("error");
          return;
        }
        setUrl(data.url);
        setState("ready");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedReflectionId, retryKey]);

  function download() {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="card-soft p-6 text-center sm:p-10">
      <span className="mx-auto grid size-12 place-items-center rounded-md bg-primary text-primary-foreground">
        <CheckCircle2 className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-6 font-display text-2xl font-bold sm:text-3xl">
        {state === "ready"
          ? "Áudio pronto"
          : state === "loading"
            ? "Preparando o áudio"
            : "Texto guardado"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {state === "error"
          ? "Sua reflexão está guardada, mas não conseguimos gerar a narração agora."
          : "Sua reflexão foi guardada no seu arquivo."}
      </p>

      <div className="mx-auto mt-8 max-w-md rounded-lg border border-border bg-secondary p-5 text-left">
        <p className="eyebrow">{capitalize(longDate(new Date()))}</p>
        <h2 className="mt-1 font-display text-lg font-bold text-primary">{title}</h2>
        <div className="mt-4">
          {state === "ready" && url ? (
            <audio controls src={url} className="w-full" aria-label="Ouvir narração" />
          ) : state === "loading" ? (
            <p className="text-sm text-muted-foreground">Isso pode levar alguns instantes…</p>
          ) : (
            <p className="text-sm text-muted-foreground">Você pode tentar gerar o áudio de novo.</p>
          )}
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-md space-y-3">
        {state === "error" ? (
          <Button
            size="lg"
            className="h-14 w-full text-base"
            onClick={() => setRetryKey((k) => k + 1)}
          >
            Tentar gerar áudio de novo
          </Button>
        ) : (
          <Button
            size="lg"
            className="h-14 w-full text-base"
            disabled={state !== "ready" || !url}
            onClick={download}
          >
            <Download className="size-5" aria-hidden="true" />
            Baixar áudio
          </Button>
        )}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button variant="outline" className="h-12 flex-1" onClick={onSeeText}>
            <FileText className="size-4" aria-hidden="true" />
            Ver texto da reflexão
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="h-12 flex-1">
                <Home className="size-4" aria-hidden="true" />
                Voltar para o início
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Encerrar a reflexão de hoje?</AlertDialogTitle>
                <AlertDialogDescription>
                  O rascunho deste fluxo será limpo. A reflexão aprovada continua no seu histórico.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-11">Ficar aqui</AlertDialogCancel>
                <AlertDialogAction className="min-h-11" onClick={onRestart}>
                  Voltar para o início
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </section>
  );
}
