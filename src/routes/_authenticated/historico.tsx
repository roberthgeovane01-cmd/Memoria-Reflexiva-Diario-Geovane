import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import { ApprovedItem } from "@/components/ApprovedItem";
import { Button } from "@/components/ui/button";
import { capitalize, longDate } from "@/lib/format";
import { useSession } from "@/lib/auth";
import { listApproved, type ApprovedReflection } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de reflexões — Memória Reflexiva" },
      {
        name: "description",
        content: "Todas as reflexões concluídas, em ordem cronológica.",
      },
      { property: "og:title", content: "Histórico de reflexões — Memória Reflexiva" },
      { property: "og:description", content: "Releia as reflexões já finalizadas." },
    ],
  }),
  component: History,
});

function History() {
  const { user } = useSession();
  const query = useQuery({
    queryKey: ["approved", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listApproved(user!.id),
  });

  const items = query.data ?? [];
  const groups = items.reduce<Record<string, ApprovedReflection[]>>((acc, r) => {
    const key = r.approved_at
      ? capitalize(
          new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
            new Date(r.approved_at),
          ),
        )
      : "Sem data";
    acc[key] = [...(acc[key] ?? []), r];
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-border pb-6">
          <p className="eyebrow">Arquivo</p>
          <h1 className="mt-3 font-display text-[28px] font-bold leading-tight sm:text-4xl">
            Histórico
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {query.isLoading
              ? "Buscando suas reflexões…"
              : items.length === 0
                ? "Nenhuma reflexão concluída até agora."
                : `${items.length} ${items.length === 1 ? "reflexão concluída" : "reflexões concluídas"}. A mais recente em ${
                    items[0]?.approved_at ? longDate(new Date(items[0].approved_at)) : "—"
                  }.`}
          </p>
        </header>

        {!query.isLoading && items.length === 0 ? (
          <div className="card-soft mt-10 p-8 text-center sm:p-12">
            <h2 className="font-display text-xl font-bold">Seu arquivo começa hoje</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Quando você aprovar a reflexão do dia, ela fica guardada aqui para reler quando
              quiser.
            </p>
            <Button asChild size="lg" className="mt-7 h-12">
              <Link to="/criar">Criar reflexão de hoje</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            {Object.entries(groups).map(([month, group]) => (
              <section key={month} aria-labelledby={`mes-${month}`}>
                <h2
                  id={`mes-${month}`}
                  className="eyebrow border-b border-primary/70 pb-2 !text-primary"
                >
                  {month}
                </h2>
                <div>
                  {group.map((r) => (
                    <ApprovedItem key={r.id} reflection={r} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
