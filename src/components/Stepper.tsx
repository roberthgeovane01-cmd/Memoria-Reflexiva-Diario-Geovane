import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const steps = [
  { key: "source", label: "Fonte" },
  { key: "comment", label: "Comentário" },
  { key: "review", label: "Reflexão" },
  { key: "audio", label: "Áudio" },
] as const;

export type StepKey = (typeof steps)[number]["key"];

export function Stepper({ current }: { current: StepKey }) {
  const activeIndex = steps.findIndex((s) => s.key === current);

  return (
    <ol
      className="flex items-center gap-2 border-b border-border pb-4 sm:gap-4"
      aria-label="Etapas da reflexão"
    >
      {steps.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-[4px] border text-[10px] font-semibold",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-sky text-sky-foreground",
                  !done && !active && "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3" /> : i + 1}
              </span>
              <span
                className={cn(
                  "truncate text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs",
                  active || done ? "text-primary" : "text-muted-foreground",
                )}
              >
                {step.label}
                {active && <span className="sr-only"> (etapa atual)</span>}
                {done && <span className="sr-only"> (concluída)</span>}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn("h-px flex-1", done ? "bg-primary/40" : "bg-border")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
