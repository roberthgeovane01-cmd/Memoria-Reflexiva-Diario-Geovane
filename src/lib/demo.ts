import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import type { ApprovedReflection, HistoricalReflection } from "@/lib/db";

/**
 * MODO DE TESTE TEMPORÁRIO — restrito ao ambiente de desenvolvimento.
 * Nada aqui toca o Supabase: nenhuma sessão real, nenhuma credencial, nenhum
 * dado do banco. Em build de produção/preview este modo é inerte: não
 * autentica, não cria sessão e nunca substitui o Supabase Auth.
 */

const FLAG_KEY = "memoria-reflexiva:modo-teste";
const APPROVED_KEY = "memoria-reflexiva:modo-teste-aprovadas";
const EVENT = "memoria-reflexiva:modo-teste-mudou";

export const DEMO_QUERY_PARAM = "modo_teste";
export const DEMO_QUERY_VALUE = "roberth";

export const DEMO_USER_ID = "modo-teste-local";
export const DEMO_DISPLAY_NAME = "Roberth Naninne";

/** Só existe em desenvolvimento. */
export const DEMO_ALLOWED = import.meta.env.DEV === true;

/** Usuário fictício, apenas para a interface. Não é uma sessão Supabase. */
export const demoUser = {
  id: DEMO_USER_ID,
  email: "roberth (modo de teste)",
  app_metadata: {},
  user_metadata: { display_name: DEMO_DISPLAY_NAME },
  aud: "demo",
  created_at: new Date(0).toISOString(),
} as unknown as User;

export function isDemoActive() {
  if (!DEMO_ALLOWED) return false;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function notify() {
  window.dispatchEvent(new Event(EVENT));
}

export function enableDemo() {
  if (!DEMO_ALLOWED) return;
  try {
    window.localStorage.setItem(FLAG_KEY, "1");
  } catch {
    /* armazenamento indisponível */
  }
  notify();
}

/** Sai do teste sem apagar rascunhos locais. */
export function disableDemo() {
  try {
    window.localStorage.removeItem(FLAG_KEY);
  } catch {
    /* armazenamento indisponível */
  }
  notify();
}

export function useDemoMode() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const sync = () => setActive(isDemoActive());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return active;
}

export function demoSessionId() {
  return `modo-teste-${new Date().toISOString().slice(0, 10)}`;
}

export function listDemoApproved(): ApprovedReflection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(APPROVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ApprovedReflection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addDemoApproved(args: { title: string; body: string }) {
  const item: ApprovedReflection = {
    id: `demo-${Date.now()}`,
    title: args.title,
    body: args.body,
    approved_at: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(APPROVED_KEY, JSON.stringify([item, ...listDemoApproved()]));
  } catch {
    /* armazenamento indisponível */
  }
  return item.id;
}

export function listDemoHistorical(): HistoricalReflection[] {
  return [];
}
