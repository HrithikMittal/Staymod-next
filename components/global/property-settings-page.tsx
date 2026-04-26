"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

import { updatePropertySettings, type PropertyDetails } from "@/api-clients/properties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useApiQuery } from "@/hooks";

type PropertySettingsPageProps = {
  propertyId: string;
};

export function PropertySettingsPage({ propertyId }: PropertySettingsPageProps) {
  const queryClient = useQueryClient();

  const propertyQuery = useApiQuery<{ property: PropertyDetails }>(
    ["property", propertyId],
    `/api/properties/${propertyId}`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const saveMutation = useMutation({
    mutationFn: (payload: { name: string; addressLine1: string; gstEnabled: boolean; gstNumber?: string }) =>
      updatePropertySettings(propertyId, {
        name: payload.name,
        addressLine1: payload.addressLine1,
        gstEnabled: payload.gstEnabled,
        gstNumber: payload.gstNumber,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-3 pb-8 md:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Property settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage core details used across invoices, receipts, and operations.
        </p>
      </header>

      <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm md:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold tracking-tight">Basic information</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the fields shown on this property profile.
          </p>
        </div>

        {propertyQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading property settings...</p>
        ) : propertyQuery.isError ? (
          <p className="text-sm text-destructive">{propertyQuery.error.message}</p>
        ) : (
          <PropertySettingsForm
            property={propertyQuery.data?.property}
            pending={saveMutation.isPending}
            errorMessage={saveMutation.isError ? saveMutation.error.message : null}
            success={saveMutation.isSuccess}
            onSubmit={(payload) => saveMutation.mutate(payload)}
          />
        )}
      </section>

      <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm md:p-5">
        <div className="mb-3">
          <h2 className="text-base font-semibold tracking-tight">Hotel GST rates (India)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reference slabs for room accommodation based on invoice value per room per night.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Room tariff</th>
                <th className="px-3 py-2 text-left font-medium">GST</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/70">
                <td className="px-3 py-2">Up to Rs 1,000</td>
                <td className="px-3 py-2 font-medium">0%</td>
              </tr>
              <tr className="border-t border-border/70">
                <td className="px-3 py-2">Rs 1,001 to Rs 7,500</td>
                <td className="px-3 py-2 font-medium">5%</td>
              </tr>
              <tr className="border-t border-border/70">
                <td className="px-3 py-2">Above Rs 7,500</td>
                <td className="px-3 py-2 font-medium">18%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

type PropertySettingsFormProps = {
  property?: PropertyDetails;
  pending: boolean;
  errorMessage: string | null;
  success: boolean;
  onSubmit: (payload: { name: string; addressLine1: string; gstEnabled: boolean; gstNumber?: string }) => void;
};

function PropertySettingsForm({
  property,
  pending,
  errorMessage,
  success,
  onSubmit,
}: PropertySettingsFormProps) {
  const initialGstEnabled = Boolean(property?.gstEnabled ?? property?.gstNumber);
  const [gstEnabled, setGstEnabled] = useState(initialGstEnabled);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const addressLine1 = String(formData.get("addressLine1") ?? "").trim();
    const gstNumber = String(formData.get("gstNumber") ?? "").trim();
    if (!name || !addressLine1) return;
    if (gstEnabled && !gstNumber) {
      setLocalError("GST number is required when GST is enabled.");
      return;
    }
    onSubmit({
      name,
      addressLine1,
      gstEnabled,
      gstNumber: gstEnabled ? gstNumber : undefined,
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <Label htmlFor="property-settings-name">Property name</Label>
        <Input
          id="property-settings-name"
          name="name"
          defaultValue={property?.name ?? ""}
          placeholder="Property name"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="property-settings-address">Property address</Label>
        <Input
          id="property-settings-address"
          name="addressLine1"
          defaultValue={property?.address?.line1 ?? ""}
          placeholder="Street and locality"
          required
        />
      </div>

      <div className="rounded-lg border border-border/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label id="property-settings-gst-enabled-label">Enable Property GST</Label>
            <p className="text-xs text-muted-foreground">Turn this on to include GST details.</p>
          </div>
          <Switch
            id="property-settings-gst-enabled"
            aria-labelledby="property-settings-gst-enabled-label"
            checked={gstEnabled}
            onCheckedChange={setGstEnabled}
            disabled={pending}
          />
        </div>
      </div>

      {gstEnabled ? (
        <div className="space-y-1.5">
          <Label htmlFor="property-settings-gst">Property GST number</Label>
          <Input
            id="property-settings-gst"
            name="gstNumber"
            defaultValue={property?.gstNumber ?? ""}
            placeholder="29ABCDE1234F2Z5"
            required
          />
        </div>
      ) : null}

      {localError ? <p className="text-sm text-destructive">{localError}</p> : null}
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      {success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">Settings saved.</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
