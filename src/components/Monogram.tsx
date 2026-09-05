export function Monogram({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
    >
      <rect x="1.5" y="1.5" width="29" height="29" rx="3" />
      <path d="M8 22V10l4 6 4-6v12" />
      <path d="M20 22v-9h3.5a2.5 2.5 0 0 1 0 5H20l4 4" />
    </svg>
  );
}
