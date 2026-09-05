import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ApprovedItem } from "@/components/ApprovedItem";
import { Button } from "@/components/ui/button";
import { capitalize, greeting, longDate } from "@/lib/format";
import { useProfile, useSession } from "@/lib/auth";
import {
  listApproved,
  loadSessionByDate,
  normalizeStatus,
  todayISO,
  type SessionStatus,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Hoje — Memória Reflexiva" },
      {
        name: "description",
        content:
          "Mesa de trabalho editorial privada para escrever, revisar e narrar uma reflexão por dia.",
      },
      { property: "og:title", content: "Hoje — Memória Reflexiva" },
      {
        property: "og:description",
        content: "Comece a reflexão de hoje a partir do que você recebeu e do que sentiu.",
      },
    ],
  }),
  component: Today,
});

/** Rótulos que espelham exatamente o estado real da sessão no servidor. */
const statusLabel: Record<SessionStatus, string> = {
  draft: "Em andamento",
  processing: "Preparando reflexão",
  review: "Aguardando sua revisão",
  approved: "Texto aprovado",
  audio_processing: "Preparando áudio",
  completed: "Concluída",
  failed: "Precisa de atenção",
};

const statusHeadline: Record<SessionStatus, string> = {
  draft: "Você já começou a reflexão de hoje.",
  processing: "Sua reflexão está sendo preparada.",
  review: "Sua reflexão está pronta para revisão.",
  approved: "Você já aprovou o texto de hoje.",
  audio_processing: "A narração de hoje está sendo preparada.",
  completed: "A reflexão de hoje já está guardada.",
  failed: "Algo não terminou como esperado hoje.",
};

const statusHelp: Record<SessionStatus, string> = {
  draft: "Seu trabalho está guardado. Continue de onde parou.",
  processing: "Volte ao fluxo para acompanhar de perto.",
  review: "Leia com calma, ajuste o que quiser e aprove quando fizer sentido.",
  approved: "Falta apenas a narração para encerrar o dia.",
  audio_processing: "Isso pode levar alguns instantes.",
  completed: "Você pode reler no histórico quando quiser.",
  failed: "Abra a reflexão de hoje para tentar novamente. Nada foi perdido.",
};

const statusCta: Record<SessionStatus, string> = {
  draft: "Continuar reflexão",
  processing: "Acompanhar reflexão",
  review: "Revisar reflexão",
  approved: "Continuar para o áudio",
  audio_processing: "Acompanhar o áudio",
  completed: "Ver reflexão de hoje",
  failed: "Retomar reflexão de hoje",
};

function Today() {
  const [now] = useState(() => new Date());
  const { user } = useSession();
  const { firstName } = useProfile(user);

  // O status vem do servidor, não do rascunho local.
  const session = useQuery({
    queryKey: ["session-today", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => loadSessionByDate(user!.id),
  });

  const approved = useQuery({
    queryKey: ["approved", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listApproved(user!.id),
  });

  const items = approved.data ?? [];
  const status = session.data ? normalizeStatus(session.data.status) : null;
  const todayApproved = items.find((r) => r.approved_at?.slice(0, 10) === todayISO());

  const badge = session.isLoading ? "Carregando…" : status ? statusLabel[status] : "Não iniciada";
  const headline = status
    ? statusHeadline[status]
    : "Comece adicionando a reflexão que você recebeu hoje.";
  const help = status
    ? statusHelp[status]
    : "Pode ser um trecho, uma frase ouvida ou uma anotação. O resto se constrói a partir dela.";
  const cta = status ? statusCta[status] : "Criar reflexão de hoje";
  const seeFinished = status === "completed" && todayApproved;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <section>
          <p className="eyebrow">{capitalize(longDate(now))}</p>
          <h1 className="mt-3 font-display text-[28px] font-bold leading-tight sm:text-4xl">
            {greeting(now)}, {capitalize(firstName)}.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Um texto por dia, no seu ritmo. Comece pelo que chegou até você.
          </p>
        </section>

        <section className="card-soft mt-9 p-6 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <p className="eyebrow">Reflexão de hoje</p>
            <span className="rounded-[5px] bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              {badge}
            </span>
          </div>
          <h2 className="mt-6 max-w-xl font-display text-xl font-bold leading-snug sm:text-2xl">
            {headline}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{help}</p>
          <div className="mt-7">
            <Button asChild size="lg" className="h-14 w-full text-base sm:h-12 sm:w-auto">
              {seeFinished ? (
                <Link to="/historico/$id" params={{ id: todayApproved.id }}>
                  {cta}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <Link to="/criar">
                  {cta}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              )}
            </Button>
          </div>
        </section>

        <section aria-labelledby="ultimas" className="mt-14">
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-primary/80 pb-3">
            <h2 id="ultimas" className="font-display text-lg font-bold">
              Últimas reflexões
            </h2>
            <Link
              to="/historico"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Ver histórico
            </Link>
          </div>
          {approved.isLoading ? (
            <p className="py-8 text-sm text-muted-foreground">Buscando suas reflexões…</p>
          ) : items.length === 0 ? (
            <p className="py-8 max-w-md text-sm leading-relaxed text-muted-foreground">
              Nada por aqui ainda. Sua primeira reflexão aprovada aparece nesta lista.
            </p>
          ) : (
            <div>
              {items.slice(0, 3).map((r) => (
                <ApprovedItem key={r.id} reflection={r} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
