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
  Play,
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
import { useSession } from "@/lib/auth";
import {
  approveReflection,
  ensureTodaySession,
  loadSessionContent,
  saveComment,
  saveEdit,
  saveGeneratedVersion,
  saveSource,
  uploadCommentAudio,
} from "@/lib/db";
import { capitalize, longDate } from "@/lib/format";
import { sampleReceived, sampleTranscript, versionOne, versionTwo } from "@/lib/reflections";
import { useDraft, type Draft } from "@/lib/useDraft";

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
      audioMimeType: audioPath ? recording?.mimeType ?? null : null,
      audioDurationSeconds: audioPath ? recording?.seconds ?? null : null,
    });
    setBusy(false);
    if (!ok) warnNotSaved();
    update({ step: "processing" });
  }

  // O texto ainda é montado localmente (futuro endpoint de backend fará a geração real).
  async function registerVersion(version: 1 | 2) {
    if (!user || !sessionId) return null;
    const base = version === 1 ? versionOne : versionTwo;
    const id = await saveGeneratedVersion({
      userId: user.id,
      sessionId,
      versionNumber: version,
      title: base.title,
      body: base.paragraphs.join("\n\n"),
    });
    return id;
  }

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
          {draft.step === "processing" && (
            <Processing
              onDone={async () => {
                const id = draft.generationV1Id ?? (await registerVersion(1));
                update({ step: "review", generationV1Id: id ?? draft.generationV1Id });
              }}
            />
          )}
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
              audioUrl={recording?.url ?? null}
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
          <VoiceRecorder
            onFinished={(result) => {
              onRecording(result);
              if (!result) return;
              if (!draft.transcript) update({ transcript: sampleTranscript });
              toast("Texto da fala pronto para revisão");
            }}
          />
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
          disabled={!canContinue || busy}
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

function Processing({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => {
        if (i >= messages.length - 1) {
          clearInterval(id);
          if (!done.current) {
            done.current = true;
            setTimeout(onDone, 900);
          }
          return i;
        }
        return i + 1;
      });
    }, 1100);
    return () => clearInterval(id);
  }, [onDone]);

  return (
    <section className="card-soft flex min-h-[380px] flex-col items-center justify-center p-10 text-center">
      <p className="eyebrow">Preparando</p>
      <p aria-live="polite" className="mt-4 font-display text-xl font-bold text-primary sm:text-2xl">
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
  onCreateVersionTwo: (version: 1 | 2) => Promise<string | null>;
  onApproved: () => void;
}) {
  const base = draft.version === 1 ? versionOne : versionTwo;
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
    if (userId && draft.sessionId) {
      const id = await approveReflection({
        userId,
        sessionId: draft.sessionId,
        sourceGenerationId: generationId,
        title: base.title,
        body: paragraphs.join("\n\n"),
      });
      if (!id) {
        setApproving(false);
        toast("Não conseguimos guardar a aprovação agora", {
          description: "Seu texto continua aqui. Tente novamente em instantes.",
        });
        return;
      }
      onApproved();
    }
    setApproving(false);
    update({ step: "audio", approved: true });
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
                    const id = draft.generationV2Id ?? (await onCreateVersionTwo(2));
                    update({
                      version: 2,
                      editedV2: draft.editedV2 ?? versionTwo.paragraphs,
                      generationV2Id: id ?? draft.generationV2Id,
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
  audioUrl,
  onRestart,
  onSeeText,
}: {
  audioUrl: string | null;
  onRestart: () => void;
  onSeeText: () => void;
}) {
  function download() {
    toast("Áudio de demonstração", {
      description: "Nesta fase, a narração final ainda não é gerada.",
    });
  }

  return (
    <section className="card-soft p-6 text-center sm:p-10">
      <span className="mx-auto grid size-12 place-items-center rounded-md bg-primary text-primary-foreground">
        <CheckCircle2 className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-6 font-display text-2xl font-bold sm:text-3xl">Áudio pronto</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Sua reflexão foi guardada no seu arquivo.
      </p>

      <div className="mx-auto mt-8 max-w-md rounded-lg border border-border bg-secondary p-5 text-left">
        <p className="eyebrow">{capitalize(longDate(new Date()))}</p>
        <h2 className="mt-1 font-display text-lg font-bold text-primary">{versionOne.title}</h2>
        <div className="mt-4">
          {audioUrl ? (
            <audio controls src={audioUrl} className="w-full" aria-label="Ouvir narração" />
          ) : (
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Play className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="h-1.5 rounded-full bg-sky/40">
                  <div className="h-full w-1/3 rounded-full bg-primary" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">1:08 / 3:24</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-md space-y-3">
        <Button size="lg" className="h-14 w-full text-base" onClick={download}>
          <Download className="size-5" aria-hidden="true" />
          Baixar áudio
        </Button>
        <p className="text-xs text-muted-foreground">
          Nesta versão, a narração é apenas um exemplo.
        </p>
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
