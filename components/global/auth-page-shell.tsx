import type { ReactNode } from "react";

export function AuthPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute -top-40 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-primary/8 blur-[120px]"
          style={{ animation: "glow-drift 12s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-0 right-1/4 size-80 rounded-full bg-primary/5 blur-[80px]"
          style={{ animation: "glow-drift 16s ease-in-out infinite reverse" }}
        />
      </div>

      {/* Dot grid */}
      <div className="dot-grid absolute inset-0 opacity-60" aria-hidden />

      <section
        className="relative w-full max-w-md rounded-2xl border border-border/60 bg-card/80 p-6 shadow-[0_0_0_1px_oklch(1_0_0_/_0.03),_0_24px_64px_oklch(0_0_0_/_0.5)] backdrop-blur-sm"
        style={{ animation: "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        {/* Brand mark */}
        <div className="mb-5 flex justify-center">
          <span className="inline-flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
              S
            </span>
            Staymod
          </span>
        </div>

        <header className="mb-6 space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </header>
        <div className="flex justify-center">{children}</div>
      </section>
    </main>
  );
}
