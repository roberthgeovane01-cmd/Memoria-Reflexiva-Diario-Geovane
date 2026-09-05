import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { capitalize, shortDate } from "@/lib/format";
import { useSession } from "@/lib/auth";
import { excerptOf, listHistorical } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/memoria")({
  head: () => ({
    meta: [
      { title: "Memória — Memória Reflexiva" },
      {
        name: "description",
        content: "As reflexões guardadas que dão continuidade à forma de pensar e escrever.",
      },
      { property: "og:title", content: "Memória — Memória Reflexiva" },
      {
        property: "og:description",
        content: "Busque entre as reflexões guardadas na memória do seu arquivo.",
      },
    ],
  }),
  component: Memory,
});

function Memory() {
  const [query, setQuery] = useState("");
  const { user } = useSession();
  const historical = useQuery({
    queryKey: ["historical", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listHistorical(user!.id),
  });

  const all = historical.data ?? [];
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (r) =>
        (r.title ?? "").toLowerCase().includes(q) ||
        (r.summary ?? "").toLowerCase().includes(q) ||
        (r.body ?? "").toLowerCase().includes(q),
    );
  }, [query, all]);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-border pb-6">
          <p className="eyebrow">Arquivo intelectual</p>
          <h1 className="mt-3 font-display text-[28px] font-bold leading-tight sm:text-4xl">
            Memória Reflexiva
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            As reflexões que ajudam o sistema a compreender sua forma de pensar e escrever.
          </p>
          <p className="mt-5 inline-flex rounded-[5px] bg-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            {historical.isLoading
              ? "Carregando memória"
              : `${all.length} ${all.length === 1 ? "reflexão" : "reflexões"} na memória`}
          </p>
        </header>

        {all.length > 0 && (
          <div className="mt-8 max-w-xl">
            <Label htmlFor="busca" className="text-sm font-medium">
              Buscar na memória
            </Label>
            <div className="relative mt-2">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="busca"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Perdão, descanso, gratidão…"
                className="h-12 rounded-md pl-10 text-base"
              />
            </div>
          </div>
        )}

        {!historical.isLoading && all.length === 0 ? (
          <div className="card-soft mt-10 p-8 text-center sm:p-12">
            <h2 className="font-display text-xl font-bold">A memória ainda está vazia</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Suas reflexões antigas ainda não foram trazidas para cá. Quando forem, você poderá
              buscá-las por palavra e tema.
            </p>
          </div>
        ) : (
          <div className="mt-10 border-t border-border">
            {results.map((r) => (
              <article
                key={r.id}
                className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 border-b border-border py-5 sm:gap-x-8"
              >
                <p className="eyebrow w-16 pt-1 sm:w-24">
                  {r.original_date ? capitalize(shortDate(r.original_date)) : "—"}
                </p>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-bold leading-snug text-primary">
                    {r.title || "Reflexão sem título"}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {excerptOf(r.summary || r.body)}
                  </p>
                </div>
              </article>
            ))}
            {!historical.isLoading && results.length === 0 && (
              <p className="py-10 text-sm text-muted-foreground">
                Nenhuma reflexão encontrada com essas palavras. Tente outro termo.
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
