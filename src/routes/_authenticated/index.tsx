import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { ApprovedItem } from "@/components/ApprovedItem";
import { Button } from "@/components/ui/button";
import { capitalize, greeting, longDate } from "@/lib/format";
import { useProfile, useSession } from "@/lib/auth";
import { listApproved, todayISO } from "@/lib/db";
import { loadDraft } from "@/lib/useDraft";

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

function Today() {
  const [now] = useState(() => new Date());
  const [inProgress, setInProgress] = useState(false);
  const { user } = useSession();
  const { firstName } = useProfile(user);

  useEffect(() => {
    if (!user?.id) return;
    const d = loadDraft(user.id);
    setInProgress(Boolean(d.received || d.comment || d.transcript));
  }, [user?.id]);

  const approved = useQuery({
    queryKey: ["approved", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listApproved(user!.id),
  });

  const items = approved.data ?? [];
  const doneToday = items.some((r) => r.approved_at?.slice(0, 10) === todayISO());

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
              {doneToday ? "Concluída" : inProgress ? "Em andamento" : "Não iniciada"}
            </span>
          </div>
          <h2 className="mt-6 max-w-xl font-display text-xl font-bold leading-snug sm:text-2xl">
            {doneToday
              ? "A reflexão de hoje já está guardada."
              : inProgress
                ? "Você já começou a reflexão de hoje."
                : "Comece adicionando a reflexão que você recebeu hoje."}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {doneToday
              ? "Você pode reler no histórico ou começar outra quando quiser."
              : inProgress
                ? "Seu trabalho está salvo. Continue de onde parou."
                : "Pode ser um trecho, uma frase ouvida ou uma anotação. O resto se constrói a partir dela."}
          </p>
          <div className="mt-7">
            <Button asChild size="lg" className="h-14 w-full text-base sm:h-12 sm:w-auto">
              <Link to="/criar">
                {inProgress ? "Continuar reflexão" : "Criar reflexão de hoje"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
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
