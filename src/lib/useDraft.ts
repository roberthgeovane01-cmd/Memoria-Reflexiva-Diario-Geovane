import { useCallback, useEffect, useRef, useState } from "react";

export type FlowStep = "source" | "comment" | "processing" | "review" | "audio";

export type Draft = {
  received: string;
  source: string;
  mode: "write" | "speak";
  comment: string;
  transcript: string;
  step: FlowStep;
  version: 1 | 2;
  editedV1: string[] | null;
  editedV2: string[] | null;
  approved: boolean;
  /** Sessão do dia no servidor. */
  sessionId: string | null;
  /** Versões registradas no servidor, quando a política permite. */
  generationV1Id: string | null;
  generationV2Id: string | null;
  /** Texto produzido pelo Motor Reflexivo (ou pelo modo de teste) para cada versão. */
  generatedV1: { title: string; paragraphs: string[] } | null;
  generatedV2: { title: string; paragraphs: string[] } | null;
  /** Reflexão aprovada no servidor — usada para pedir a narração. */
  approvedReflectionId: string | null;
};

export const emptyDraft: Draft = {
  received: "",
  source: "",
  mode: "write",
  comment: "",
  transcript: "",
  step: "source",
  version: 1,
  editedV1: null,
  editedV2: null,
  approved: false,
  sessionId: null,
  generationV1Id: null,
  generationV2Id: null,
  generatedV1: null,
  generatedV2: null,
  approvedReflectionId: null,
};

// Rascunho local: apenas rede de segurança offline. A verdade fica no servidor.
// Cada rascunho é isolado por usuário e por data da reflexão — nunca há leitura
// cruzada entre contas neste mesmo navegador.
const PREFIX = "memoria-reflexiva:draft";
const LEGACY_KEY = "memoria-reflexiva:draft-v1";
const LEGACY_DONE_KEY = "memoria-reflexiva:draft-legado-migrado";

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function draftKey(userId: string, date = todayKey()) {
  return `${PREFIX}:${userId}:${date}`;
}

function read(key: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return { ...emptyDraft, ...(JSON.parse(raw) as Partial<Draft>) };
  } catch {
    return null;
  }
}

/**
 * Move uma única vez o rascunho da chave global antiga para a chave do usuário
 * autenticado atual, e só então apaga a chave antiga.
 */
function migrateLegacy(userId: string, date: string) {
  try {
    if (window.localStorage.getItem(LEGACY_DONE_KEY)) return;
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (!legacy) {
      window.localStorage.setItem(LEGACY_DONE_KEY, "1");
      return;
    }
    const target = draftKey(userId, date);
    if (!window.localStorage.getItem(target)) {
      window.localStorage.setItem(target, legacy);
    }
    window.localStorage.removeItem(LEGACY_KEY);
    window.localStorage.setItem(LEGACY_DONE_KEY, "1");
  } catch {
    /* armazenamento indisponível */
  }
}

export function loadDraft(userId: string | null | undefined, date = todayKey()): Draft {
  if (typeof window === "undefined" || !userId) return emptyDraft;
  migrateLegacy(userId, date);
  return read(draftKey(userId, date)) ?? emptyDraft;
}

/** Apaga somente o rascunho do usuário na data informada. */
export function clearDraft(userId: string | null | undefined, date = todayKey()) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.removeItem(draftKey(userId, date));
  } catch {
    /* armazenamento indisponível */
  }
}

/** Apaga todos os rascunhos do usuário informado, em qualquer data. */
export function clearUserDrafts(userId: string | null | undefined) {
  if (typeof window === "undefined" || !userId) return;
  try {
    const scope = `${PREFIX}:${userId}:`;
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(scope)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    /* armazenamento indisponível */
  }
}

/** Rascunho com salvamento automático no navegador (fallback offline). */
export function useDraft(userId: string | null | undefined, date = todayKey()) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) {
      setHydrated(false);
      setDraft(emptyDraft);
      return;
    }
    setDraft(loadDraft(userId, date));
    setHydrated(true);
  }, [userId, date]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey(userId, date), JSON.stringify(draft));
        setSavedAt(Date.now());
      } catch {
        /* armazenamento indisponível */
      }
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, hydrated, userId, date]);

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    clearDraft(userId, date);
    setDraft(emptyDraft);
  }, [userId, date]);

  return { draft, update, reset, hydrated, savedAt };
}
