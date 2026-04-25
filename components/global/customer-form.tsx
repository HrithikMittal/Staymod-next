"use client";

import { useState, type FormEvent } from "react";

import type { UpsertCustomerPayload } from "@/api-clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CustomerFormProps = {
  initialValue?: UpsertCustomerPayload;
  submitLabel: string;
  pendingLabel: string;
  isPending?: boolean;
  errorMessage?: string;
  onSubmit: (payload: UpsertCustomerPayload) => void;
  onCancel?: () => void;
};

export function CustomerForm({
  initialValue,
  submitLabel,
  pendingLabel,
  isPending,
  errorMessage,
  onSubmit,
  onCancel,
}: CustomerFormProps) {
  const [form, setForm] = useState<UpsertCustomerPayload>(
    initialValue ?? { email: "", name: "", phone: "" },
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      email: form.email.trim(),
      name: form.name?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground uppercase">Email</span>
        <Input
          type="email"
          required
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          placeholder="guest@example.com"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase">Name</span>
          <Input
            value={form.name ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Guest name"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase">Phone</span>
          <Input
            value={form.phone ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="+91..."
          />
        </label>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
