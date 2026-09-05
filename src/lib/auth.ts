import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { DEMO_DISPLAY_NAME, DEMO_USER_ID, demoUser, disableDemo, useDemoMode } from "@/lib/demo";

export type Profile = {
  id: string;
  display_name: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/** Mensagens humanas — nunca expor texto técnico do servidor. */
export function friendlyAuthError(message?: string | null) {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login")) return "Email ou senha não conferem. Tente novamente.";
  if (m.includes("email not confirmed"))
    return "Confirme seu email pelo link que enviamos antes de entrar.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Já existe uma conta com esse email. Use “Entrar”.";
  if (m.includes("password")) return "Escolha uma senha com pelo menos 8 caracteres.";
  if (m.includes("email address") && m.includes("invalid")) return "Confira o endereço de email.";
  if (m.includes("rate") || m.includes("too many"))
    return "Muitas tentativas em pouco tempo. Aguarde um instante.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Não conseguimos falar com o servidor. Verifique sua conexão.";
  return "Algo não funcionou agora. Tente novamente em instantes.";
}

export function useSession() {
  const demo = useDemoMode();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Uma sessão real do Supabase sempre tem prioridade sobre o modo de teste.
  if (session?.user) return { session, user: session.user, loading: false, isDemo: false };
  if (demo) return { session: null, user: demoUser, loading: false, isDemo: true };
  return { session, user: null, loading, isDemo: false };
}

/** Perfil em public.profiles — criado automaticamente por trigger no cadastro. */
export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user?.id === DEMO_USER_ID) {
      setProfile({ id: DEMO_USER_ID, display_name: DEMO_DISPLAY_NAME });
      return;
    }
    if (!user) {
      setProfile(null);
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("id, display_name, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setProfile((data as Profile | null) ?? null);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const firstName =
    profile?.display_name?.trim().split(/\s+/)[0] ?? user?.email?.split("@")[0] ?? "você";

  return { profile, firstName };
}

export async function signOut() {
  disableDemo();
  await supabase.auth.signOut();
}
