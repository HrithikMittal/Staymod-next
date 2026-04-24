import { Building2Icon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type PropertiesEmptyStateProps = {
  onAdd: () => void;
};

export function PropertiesEmptyState({ onAdd }: PropertiesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div
        className="flex size-14 items-center justify-center rounded-2xl border border-border/50 bg-muted/50 text-muted-foreground"
        aria-hidden
      >
        <Building2Icon className="size-7" />
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <p className="text-lg font-medium tracking-tight">No properties yet</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Add your first stay — hotel, homestay, or farmstay — to start managing it with your team.
        </p>
      </div>
      <Button type="button" onClick={onAdd}>
        <PlusIcon data-icon="inline-start" />
        Add a property
      </Button>
    </div>
  );
}
