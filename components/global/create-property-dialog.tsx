"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

import type { CreatePropertyPayload } from "@/api-clients";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiMutation } from "@/hooks";

const EMPTY_FORM: CreatePropertyPayload = {
  name: "",
  type: "hotel",
  address: {
    line1: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
  },
};

type CreatePropertyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreatePropertyDialog({ open, onOpenChange }: CreatePropertyDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreatePropertyPayload>(EMPTY_FORM);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setForm(EMPTY_FORM);
    }
  }

  const createPropertyMutation = useApiMutation<{ property: unknown }, CreatePropertyPayload>(
    "/api/properties",
    undefined,
    {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["properties"] });
        handleOpenChange(false);
      },
    },
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createPropertyMutation.mutate(form);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>New property</DialogTitle>
          <DialogDescription>
            Register a hotel, homestay, or other stay for your organization.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dialog-property-name">Property name</Label>
            <Input
              id="dialog-property-name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              placeholder="Coraltalk Residency"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dialog-property-type">Property type</Label>
            <select
              id="dialog-property-type"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  type: event.target.value as CreatePropertyPayload["type"],
                }))
              }
            >
              <option value="hotel">Hotel</option>
              <option value="farmhouse">Farmhouse</option>
              <option value="villa">Villa</option>
              <option value="homestay">Homestay</option>
              <option value="resort">Resort</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dialog-property-address">Address line</Label>
            <Input
              id="dialog-property-address"
              value={form.address.line1}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  address: { ...prev.address, line1: event.target.value },
                }))
              }
              placeholder="Street and locality"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dialog-property-city">City</Label>
              <Input
                id="dialog-property-city"
                value={form.address.city}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, city: event.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dialog-property-state">State</Label>
              <Input
                id="dialog-property-state"
                value={form.address.state}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, state: event.target.value },
                  }))
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dialog-property-country">Country</Label>
              <Input
                id="dialog-property-country"
                value={form.address.country}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, country: event.target.value },
                  }))
                }
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dialog-property-postal">Postal code</Label>
              <Input
                id="dialog-property-postal"
                value={form.address.postalCode}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    address: { ...prev.address, postalCode: event.target.value },
                  }))
                }
                required
              />
            </div>
          </div>

          {createPropertyMutation.error ? (
            <p className="text-sm text-destructive">{createPropertyMutation.error.message}</p>
          ) : null}

          <Button className="w-full" type="submit" disabled={createPropertyMutation.isPending}>
            {createPropertyMutation.isPending ? "Creating..." : "Create property"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
