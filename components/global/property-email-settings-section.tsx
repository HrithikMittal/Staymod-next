"use client";

import type { GetEmailSettingsResponse, PropertyEmailSettingsPublic } from "@/api-clients/email-settings";
import { patchEmailSettings } from "@/api-clients/email-settings";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useApiQuery } from "@/hooks";

type PropertyEmailSettingsSectionProps = {
  propertyId: string;
};

function PropertyEmailSettingsForm({
  propertyId,
  initial,
}: {
  propertyId: string;
  initial: PropertyEmailSettingsPublic;
}) {
  const queryClient = useQueryClient();
  const [fromEmail, setFromEmail] = useState(initial.fromEmail);
  const [newApiKey, setNewApiKey] = useState("");
  const [notifyOnConfirmation, setNotifyOnConfirmation] = useState(initial.notifyOnConfirmation);
  const [notifyOnUpdate, setNotifyOnUpdate] = useState(initial.notifyOnUpdate);
  const [notifyOnCancellation, setNotifyOnCancellation] = useState(initial.notifyOnCancellation);

  const saveMutation = useMutation({
    mutationFn: () =>
      patchEmailSettings(propertyId, {
        ...(newApiKey.trim() ? { resendApiKey: newApiKey.trim() } : {}),
        fromEmail,
        notifyOnConfirmation,
        notifyOnUpdate,
        notifyOnCancellation,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["integration-email-settings", propertyId] });
      setNewApiKey("");
    },
  });

  const removeKeyMutation = useMutation({
    mutationFn: () => patchEmailSettings(propertyId, { resendApiKey: null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["integration-email-settings", propertyId] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="resend-from-email">From address</Label>
        <Input
          id="resend-from-email"
          type="email"
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          placeholder="bookings@yourdomain.com"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Must be a domain you have verified in the same Resend account as the API key.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="resend-api-key">Resend API key</Label>
        <Input
          id="resend-api-key"
          type="password"
          value={newApiKey}
          onChange={(e) => setNewApiKey(e.target.value)}
          placeholder={initial.hasApiKey ? "Leave blank to keep existing key" : "re_…"}
          autoComplete="off"
        />
        {initial.apiKeyMasked ? (
          <p className="text-xs text-muted-foreground">
            Current key: <span className="font-mono">{initial.apiKeyMasked}</span>
          </p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-md border border-border/70 p-3">
        <p className="text-sm font-medium">Send to guests when</p>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Booking is confirmed (new or first time confirmed)</span>
          <Switch checked={notifyOnConfirmation} onCheckedChange={setNotifyOnConfirmation} />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Booking details change</span>
          <Switch checked={notifyOnUpdate} onCheckedChange={setNotifyOnUpdate} />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Booking is cancelled</span>
          <Switch checked={notifyOnCancellation} onCheckedChange={setNotifyOnCancellation} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || removeKeyMutation.isPending}
        >
          Save email settings
        </Button>
        {initial.hasApiKey ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => removeKeyMutation.mutate()}
            disabled={saveMutation.isPending || removeKeyMutation.isPending}
          >
            Remove API key
          </Button>
        ) : null}
      </div>
      {saveMutation.isError ? (
        <p className="text-sm text-destructive">{saveMutation.error.message}</p>
      ) : null}
      {removeKeyMutation.isError ? (
        <p className="text-sm text-destructive">{removeKeyMutation.error.message}</p>
      ) : null}
    </div>
  );
}

export function PropertyEmailSettingsSection({ propertyId }: PropertyEmailSettingsSectionProps) {
  const emailQuery = useApiQuery<GetEmailSettingsResponse>(
    ["integration-email-settings", propertyId],
    `/api/properties/${propertyId}/email-settings`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add a{" "}
        <a
          href="https://resend.com/docs/dashboard/api-keys/introduction"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline underline-offset-2"
        >
          Resend API key
        </a>{" "}
        from your own Resend project and a verified sender address. Guests receive email only when the
        matching notification is enabled below.
      </p>

      {emailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading email settings...</p>
      ) : emailQuery.isError ? (
        <p className="text-sm text-destructive">{emailQuery.error.message}</p>
      ) : emailQuery.data ? (
        <PropertyEmailSettingsForm
          key={emailQuery.data.emailSettings.updatedAt ?? "new"}
          propertyId={propertyId}
          initial={emailQuery.data.emailSettings}
        />
      ) : null}
    </div>
  );
}
