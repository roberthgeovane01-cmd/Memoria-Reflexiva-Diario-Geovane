import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { capitalize, longDate } from "@/lib/format";
import { getApprovedById, loadAudioState } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/historico/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da reflexão — Memória Reflexiva" },
      {
        name: "description",
        content: "Releia o texto aprovado de uma reflexão e ouça a narração final.",
      },
      { property: "og:title", content: "Detalhes da reflexão — Memória Reflexiva" },
      {
        property: "og:description",
        content: "O texto aprovado do dia, com a narração guardada junto.",
      },
    ],
  }),
  component: ReflectionDetail,
});

function ReflectionDetail() {
  const { id } = Route.useParams();

  const reflection = useQuery({
    queryKey: ["approved-detail", id],
    queryFn: () => getApprovedById(id),
  });

  const audio = useQuery({
    queryKey: ["approved-audio", id],
    enabled: Boolean(reflection.data?.id),
    queryFn: () => loadAudioState(id),
  });

  const paragraphs = (reflection.data?.body ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const audioUrl = audio.data?.state === "ready" ? audio.data.url : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <Button asChild variant="ghost" className="h-11 -ml-3">
          <Link to="/historico">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar ao histórico
          </Link>
        </Button>

        {reflection.isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Abrindo sua reflexão…</p>
        ) : !reflection.data ? (
          <section className="card-soft mt-8 p-8 text-center">
            <h1 className="font-display text-xl font-bold">Reflexão não encontrada</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Esta reflexão não está disponível na sua conta.
            </p>
          </section>
        ) : (
          <>
            <article className="card-soft mt-6 p-6 sm:p-12">
              <p className="eyebrow">
                {reflection.data.approved_at
                  ? capitalize(longDate(new Date(reflection.data.approved_at)))
                  : "Sem data"}
              </p>
              <h1 className="mt-3 font-display text-2xl font-bold leading-snug text-primary sm:text-[32px]">
                {reflection.data.title || "Reflexão sem título"}
              </h1>
              <div className="prose-reflection mt-6">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </article>

            <section
              aria-labelledby="narracao"
              className="mt-6 rounded-lg border border-border bg-secondary p-5"
            >
              <h2 id="narracao" className="eyebrow !text-primary">
                Narração
              </h2>
              <div className="mt-4 space-y-4">
                {audio.isLoading ? (
                  <p className="text-sm text-muted-foreground">Buscando o áudio…</p>
                ) : audioUrl ? (
                  <>
                    <audio controls src={audioUrl} className="w-full" aria-label="Ouvir narração" />
                    <Button
                      variant="outline"
                      className="h-12 w-full sm:w-auto"
                      onClick={() => window.open(audioUrl, "_blank", "noopener,noreferrer")}
                    >
                      <Download className="size-4" aria-hidden="true" />
                      Baixar áudio
                    </Button>
                  </>
                ) : audio.data?.state === "processing" ? (
                  <p className="text-sm text-muted-foreground">Preparando o áudio…</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Esta reflexão ainda não tem narração guardada.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
