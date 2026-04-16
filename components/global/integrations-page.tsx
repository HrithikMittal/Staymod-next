"use client";

import type { ApiKeyItem, ListApiKeysResponse } from "@/api-clients";
import { createApiKey, deleteApiKey, updateApiKey } from "@/api-clients/api-keys";
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiQuery } from "@/hooks";

type IntegrationsPageProps = {
  propertyId: string;
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function IntegrationsPage({ propertyId }: IntegrationsPageProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [allowedOriginsText, setAllowedOriginsText] = useState("");
  const [allowedIpsText, setAllowedIpsText] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["rooms:read", "availability:read"]);

  const apiKeysQuery = useApiQuery<ListApiKeysResponse>(
    ["integration-api-keys", propertyId],
    `/api/properties/${propertyId}/integrations/api-keys`,
    undefined,
    { enabled: Boolean(propertyId) },
  );

  const createMutation = useMutation({
    mutationFn: () =>
      createApiKey(propertyId, {
        name: newName.trim() || undefined,
        scopes: selectedScopes,
        allowedOrigins: allowedOriginsText,
        allowedIps: allowedIpsText,
      }),
    onSuccess: async (result) => {
      setRawKey(result.rawKey);
      setNewName("");
      setAllowedOriginsText("");
      setAllowedIpsText("");
      await queryClient.invalidateQueries({ queryKey: ["integration-api-keys", propertyId] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ key, nextActive }: { key: ApiKeyItem; nextActive: boolean }) =>
      updateApiKey(propertyId, key._id, { isActive: nextActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["integration-api-keys", propertyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: ApiKeyItem) => deleteApiKey(propertyId, key._id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["integration-api-keys", propertyId] });
    },
  });

  const baseApiUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/public/v1`;
    }
    return "https://your-domain.com/api/public/v1";
  }, []);

  async function copyApiKey() {
    if (!rawKey) return;
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-3 pb-8 md:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect this property to external apps using API endpoints and API keys.
        </p>
      </header>

      <SectionCard
        title="API Access"
        description="Manage API keys with scopes and origin/IP restrictions for customer integrations."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="integration-api-key-name">Key name (optional)</Label>
            <Input
              id="integration-api-key-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Customer website production key"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Scopes</Label>
            <div className="flex flex-wrap gap-2">
              {["rooms:read", "availability:read", "bookings:write"].map((scope) => {
                const checked = selectedScopes.includes(scope);
                return (
                  <label key={scope} className="inline-flex items-center gap-2 rounded border px-2 py-1 text-xs">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) =>
                        setSelectedScopes((prev) =>
                          next ? [...new Set([...prev, scope])] : prev.filter((s) => s !== scope),
                        )
                      }
                    />
                    {scope}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="integration-allowed-origins">Allowed origins (comma/newline)</Label>
            <Input
              id="integration-allowed-origins"
              value={allowedOriginsText}
              onChange={(e) => setAllowedOriginsText(e.target.value)}
              placeholder="https://www.customer.com, https://app.customer.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="integration-allowed-ips">Allowed IPs (optional, comma/newline)</Label>
            <Input
              id="integration-allowed-ips"
              value={allowedIpsText}
              onChange={(e) => setAllowedIpsText(e.target.value)}
              placeholder="203.0.113.10, 198.51.100.22"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || selectedScopes.length === 0}
            >
              Create API key
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="integration-api-base-url">Base API URL</Label>
            <Input id="integration-api-base-url" value={baseApiUrl} readOnly />
          </div>
          {rawKey ? (
          <div className="space-y-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
            <Label htmlFor="integration-api-key">New API key (shown once)</Label>
            <div className="flex gap-2">
              <Input id="integration-api-key" value={rawKey} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={copyApiKey}>
                {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Store this secret now. It cannot be retrieved again.</p>
          </div>
          ) : null}

          <div className="space-y-2">
            <Label>Existing keys</Label>
            {apiKeysQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading API keys...</p>
            ) : apiKeysQuery.isError ? (
              <p className="text-sm text-destructive">{apiKeysQuery.error.message}</p>
            ) : (apiKeysQuery.data?.apiKeys.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No API keys yet.</p>
            ) : (
              <div className="space-y-2">
                {apiKeysQuery.data?.apiKeys.map((key) => (
                  <div key={key._id} className="rounded-md border border-border/70 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{key.name ?? "Unnamed key"}</p>
                        <p className="font-mono text-xs text-muted-foreground">{key.keyPrefix}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">{key.isActive ? "Active" : "Inactive"}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActiveMutation.mutate({ key, nextActive: !key.isActive })}
                          disabled={toggleActiveMutation.isPending}
                        >
                          {key.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(key)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Scopes: {key.scopes.join(", ")}</p>
                    <p className="text-xs text-muted-foreground">
                      Origins: {key.allowedOrigins.length > 0 ? key.allowedOrigins.join(", ") : "Any"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      IPs: {key.allowedIps.length > 0 ? key.allowedIps.join(", ") : "Any"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Webhook Configuration"
        description="Send booking and inventory events to your external platform."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="integration-webhook-url">Webhook URL</Label>
            <Input id="integration-webhook-url" placeholder="https://example.com/webhooks/staymod" />
          </div>
          <div className="grid gap-2">
            <Label className="text-sm">Events</Label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked />
              Booking created
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked />
              Booking cancelled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked />
              Room availability updated
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button">Save webhook</Button>
            <Button type="button" variant="outline">
              Send test event
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Quick Start"
        description="Basic steps to integrate your system with Staymod APIs."
      >
        <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
          <li>Store your API key securely on the server side.</li>
          <li>Call property APIs with your key in the Authorization header.</li>
          <li>Subscribe to webhook events for near real-time sync.</li>
          <li>Use idempotency keys in your write calls to avoid duplicates.</li>
        </ol>
        <div className="mt-4">
          <Button type="button" variant="outline">
            <ExternalLinkIcon data-icon="inline-start" />
            View API docs
          </Button>
        </div>
      </SectionCard>
    </main>
  );
}
