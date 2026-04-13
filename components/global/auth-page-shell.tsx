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
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <header className="mb-5 space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </header>
        <div className="flex justify-center">{children}</div>
      </section>
    </main>
  );
}
