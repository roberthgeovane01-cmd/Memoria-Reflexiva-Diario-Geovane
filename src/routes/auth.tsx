import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Monogram } from "@/components/Monogram";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth";
import {
  DEMO_DISPLAY_NAME,
  DEMO_QUERY_PARAM,
  DEMO_QUERY_VALUE,
  DEMO_ALLOWED,
  disableDemo,
  enableDemo,
  isDemoActive,
} from "@/lib/demo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Memória Reflexiva" },
      {
        name: "description",
        content: "Acesse sua mesa de trabalho privada para escrever a reflexão do dia.",
      },
      { property: "og:title", content: "Entrar — Memória Reflexiva" },
      {
        property: "og:description",
        content: "Sua mesa de trabalho editorial privada, protegida por email e senha.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wanted = DEMO_ALLOWED && params.get(DEMO_QUERY_PARAM) === DEMO_QUERY_VALUE;
    if (wanted && isDemoActive()) {
      navigate({ to: "/", replace: true });
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // Sessão real sempre tem prioridade sobre o acesso de contingência.
        disableDemo();
        navigate({ to: "/", replace: true });
        return;
      }
      setShowDemo(wanted);
    });
  }, [navigate]);

  function startDemo() {
    if (!DEMO_ALLOWED) return;
    enableDemo();
    navigate({ to: "/", replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    // Login real nunca deve conviver com o acesso de contingência.
    disableDemo();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast(friendlyAuthError(error.message));
        return;
      }
      disableDemo();
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast(friendlyAuthError(error instanceof Error ? error.message : null));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-[1fr_1.1fr]">
      <section className="hidden flex-col justify-between border-r border-border bg-card p-12 md:flex">
        <div className="flex items-center gap-3">
          <Monogram className="size-8 text-primary" />
          <span className="font-display text-base font-bold text-primary">Memória Reflexiva</span>
        </div>
        <div className="max-w-sm">
          <p className="eyebrow">Mesa de trabalho privada</p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-snug text-primary">
            Um texto por dia, no seu ritmo.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Guardamos suas reflexões, comentários e áudios em um espaço só seu.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Acesso restrito</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 md:hidden">
            <Monogram className="size-8 text-primary" />
            <span className="font-display text-base font-bold text-primary">Memória Reflexiva</span>
          </div>

          <p className="eyebrow mt-8">Acesso privado</p>
          <h1 className="mt-3 font-display text-[28px] font-bold leading-tight sm:text-4xl">
            Entrar
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Entre com seu email e senha para acessar sua mesa de trabalho.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-sm font-medium">
                Senha
              </Label>
              <Input
                id="senha"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-12 text-base"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={busy}
              className="h-14 w-full text-base sm:h-12"
            >
              {busy ? "Um instante…" : "Entrar"}
            </Button>
          </form>

          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            O acesso é criado pela administração. Se precisar de uma conta ou de uma nova senha,
            fale com o responsável pelo aplicativo.
          </p>

          {DEMO_ALLOWED && showDemo && (
            <div className="mt-10 rounded-lg border border-border bg-card p-5">
              <p className="eyebrow">Modo de teste</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Acesso temporário de demonstração, só neste navegador. Nada é enviado ou lido da sua
                base de reflexões.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={startDemo}
                className="mt-4 h-12 w-full text-base sm:h-11"
              >
                Entrar como {DEMO_DISPLAY_NAME.split(" ")[0]}
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
