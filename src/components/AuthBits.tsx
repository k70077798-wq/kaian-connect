import { ReactNode } from "react";

export function SocialRow({ onPick }: { onPick: (p: "google" | "facebook" | "apple") => void }) {
  const btn =
    "grid h-14 w-20 place-items-center rounded-2xl bg-card shadow-card border border-border/60 transition hover:-translate-y-0.5 hover:shadow-elegant sm:w-24";
  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold text-muted-foreground">أو سجل باستخدام</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="mt-4 flex items-center justify-center gap-3 sm:gap-4">
        <button type="button" aria-label="Google" className={btn} onClick={() => onPick("google")}>
          <svg viewBox="0 0 48 48" className="h-6 w-6">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v8.4h12.5c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.5-4.2 6.6-10.2 6.6-17.5z" />
            <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.5-5.8l-7.6-5.9c-2 1.4-4.7 2.4-7.9 2.4-6.4 0-11.7-3.7-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
        </button>
        <button type="button" aria-label="Facebook" className={btn} onClick={() => onPick("facebook")}>
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#1877F2">
            <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.6.2 2.6.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z" />
          </svg>
        </button>
        <button type="button" aria-label="Apple" className={btn} onClick={() => onPick("apple")}>
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-foreground">
            <path d="M16.4 12.9c0-2.6 2.1-3.8 2.2-3.9-1.2-1.7-3-2-3.6-2-1.6-.1-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.1 2.5-1.8 3-.5 7.5 1.3 10 .9 1.2 1.9 2.5 3.2 2.5 1.3 0 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8s2.2-1.2 3.1-2.4c.6-.9.9-1.3 1.4-2.3-3.5-1.3-2.8-5.2-2.8-4.4zM14.6 4.9c.7-.9 1.2-2.1 1-3.4-1.1.1-2.4.8-3.2 1.7-.7.8-1.2 2-1.1 3.2 1.2.1 2.5-.6 3.3-1.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-bold text-primary">{label}</p>
      <div className="field-shell flex items-center gap-3 rounded-2xl px-3 py-2">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-card">{icon}</span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
