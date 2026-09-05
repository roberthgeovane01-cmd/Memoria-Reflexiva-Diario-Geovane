import { capitalize, shortDate } from "@/lib/format";
import { excerptOf, type ApprovedReflection } from "@/lib/db";

export function ApprovedItem({ reflection }: { reflection: ApprovedReflection }) {
  const date = reflection.approved_at ? new Date(reflection.approved_at) : null;

  return (
    <article className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-1 border-b border-border py-5 sm:gap-x-8">
      <p className="eyebrow w-16 pt-1 sm:w-24">{date ? capitalize(shortDate(date)) : "—"}</p>
      <div className="min-w-0">
        <h3 className="font-display text-base font-bold leading-snug text-primary sm:text-lg">
          {reflection.title || "Reflexão sem título"}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {excerptOf(reflection.body)}
        </p>
      </div>
    </article>
  );
}
