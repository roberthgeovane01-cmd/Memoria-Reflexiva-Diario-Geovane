import { Check, CloudOff, Loader2, TriangleAlert } from "lucide-react";

/**
 * Estados honestos de salvamento. "Sincronizado" só aparece depois de uma
 * resposta bem-sucedida do servidor — nunca por causa do rascunho local.
 */
export type SyncState = "local" | "saving" | "synced" | "error";

const copy: Record<SyncState, string> = {
  local: "Salvo neste dispositivo — aguardando sincronização",
  saving: "Salvando…",
  synced: "Sincronizado",
  error: "Não foi possível sincronizar",
};

export function SyncStatus({ state, className }: { state: SyncState; className?: string }) {
  const Icon =
    state === "saving"
      ? Loader2
      : state === "synced"
        ? Check
        : state === "error"
          ? TriangleAlert
          : CloudOff;

  return (
    <p
      aria-live="polite"
      className={[
        "flex items-center gap-1.5 text-xs",
        state === "error" ? "text-destructive" : "text-muted-foreground",
        className ?? "",
      ].join(" ")}
    >
      <Icon
        className={[
          "size-3.5 shrink-0",
          state === "saving" ? "animate-spin" : "",
          state === "synced" ? "text-primary" : "",
        ].join(" ")}
        aria-hidden="true"
      />
      {copy[state]}
      {state === "synced" && <span className="sr-only"> com sucesso</span>}
    </p>
  );
}
