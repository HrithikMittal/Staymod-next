"use client";

import { CheckIcon, CopyIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type IntegrationsPageProps = {
  propertyId: string;
};

function buildExampleApiKey(propertyId: string): string {
  const suffix = propertyId.replace(/[^a-zA-Z0-9]/g, "").slice(-12) || "property";
  return `sk_live_${suffix}_replace_in_prod`;
}

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
  const [copied, setCopied] = useState(false);
  const apiKey = useMemo(() => buildExampleApiKey(propertyId), [propertyId]);
  const baseApiUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api`;
    }
    return "https://your-domain.com/api";
  }, []);

  async function copyApiKey() {
    try {
      await navigator.clipboard.writeText(apiKey);
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
        description="Use the following base URL and API key for server-to-server integrations."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="integration-api-base-url">Base API URL</Label>
            <Input id="integration-api-base-url" value={baseApiUrl} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="integration-api-key">API key</Label>
            <div className="flex gap-2">
              <Input id="integration-api-key" value={apiKey} readOnly className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={copyApiKey}>
                {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button type="button" variant="outline">
                <RefreshCwIcon data-icon="inline-start" />
                Regenerate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This is a placeholder key UI. Wire it to your key-management API before production use.
            </p>
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
