import { Link, useNavigate } from "@tanstack/react-router";
import { Archive, CalendarDays, Layers, LogOut, Settings, User } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Monogram } from "@/components/Monogram";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useProfile, useSession } from "@/lib/auth";
import { DEMO_QUERY_PARAM, DEMO_QUERY_VALUE, disableDemo } from "@/lib/demo";
import { clearUserDrafts } from "@/lib/useDraft";

const nav = [
  { to: "/", label: "Hoje", icon: CalendarDays },
  { to: "/historico", label: "Histórico", icon: Archive },
  { to: "/memoria", label: "Memória", icon: Layers },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, isDemo } = useSession();
  const { profile, firstName } = useProfile(user);
  const displayName = profile?.display_name?.trim() || firstName;
  const initial = displayName.charAt(0).toUpperCase();

  function handleLeaveDemo() {
    disableDemo();
    navigate({
      to: "/auth",
      search: { [DEMO_QUERY_PARAM]: DEMO_QUERY_VALUE },
      replace: true,
    });
  }

  async function handleSignOut() {
    // Limpa apenas os caches do usuário atual.
    clearUserDrafts(user?.id);
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex min-w-0 items-center gap-3 rounded-md">
            <Monogram className="size-8 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block truncate font-display text-[15px] font-bold leading-tight tracking-tight text-primary sm:text-base">
                Memória Reflexiva
              </span>
              <span className="hidden text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:block">
                Produção Intelectual Diária
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {isDemo && (
              <div className="hidden items-center gap-2 sm:flex">
                <span className="rounded-[5px] border border-primary/25 bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                  Modo teste — dados locais
                </span>
                <button
                  type="button"
                  onClick={handleLeaveDemo}
                  className="min-h-9 rounded-md px-2 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sair do teste
                </button>
              </div>
            )}
            <nav aria-label="Navegação principal" className="hidden items-center md:flex">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  className="relative px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary after:absolute after:inset-x-3 after:-bottom-[13px] after:h-[2px] after:bg-transparent data-[status=active]:text-primary data-[status=active]:after:bg-primary sm:after:-bottom-[17px]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Menu de ${displayName}`}
                className="ml-2 flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary sm:px-3"
              >
                <span className="grid size-7 place-items-center rounded-[5px] bg-primary text-xs font-semibold text-primary-foreground">
                  {initial}
                </span>
                <span className="hidden max-w-32 truncate sm:inline">{displayName}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <span className="block truncate text-sm font-medium">{displayName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {user?.email ?? "Reflexão diária"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => toast("Perfil disponível em breve")}>
                  <User className="size-4" /> Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast("Preferências disponíveis em breve")}>
                  <Settings className="size-4" /> Preferências
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void handleSignOut()}>
                  <LogOut className="size-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {isDemo && (
        <div className="border-b border-border bg-secondary/60 sm:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
              Modo teste — dados locais
            </span>
            <button
              type="button"
              onClick={handleLeaveDemo}
              className="min-h-9 rounded-md px-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Sair do teste
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-7 sm:px-6 sm:pb-20 sm:pt-12">
        {children}
      </main>

      <nav
        aria-label="Navegação"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card md:hidden"
      >
        <ul className="mx-auto flex max-w-md">
          {nav.map((item) => (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium tracking-wide text-muted-foreground transition-colors data-[status=active]:text-primary"
              >
                <item.icon className="size-5" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
