"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyIcon, MailIcon, CheckIcon, InfoIcon } from "lucide-react";
import { toast } from "react-toastify";

type PropertyInboundSyncSectionProps = {
  propertyId: string;
};

export function PropertyInboundSyncSection({
  propertyId,
}: PropertyInboundSyncSectionProps) {
  const [copied, setCopied] = useState(false);

  const inboundEmail = `property-${propertyId}@inbound.staymod.in`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inboundEmail);
      setCopied(true);
      toast.success("Email copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy email");
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Inbound Booking Sync</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Automatically import bookings from OTA confirmation emails using AI
        </p>
      </div>

      {/* Email Address Card */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <MailIcon className="size-5 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-medium">Your Unique Inbound Email</h3>
              <p className="text-sm text-muted-foreground">
                Forward OTA booking emails to this address to automatically create bookings
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inbound-email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="inbound-email"
                  value={inboundEmail}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  aria-label="Copy email"
                >
                  {copied ? (
                    <CheckIcon className="size-4 text-emerald-600" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 p-4 flex gap-3">
          <InfoIcon className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              AI-Powered Parsing
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              We use OpenAI GPT-4 to automatically extract booking details from emails. Works
              with Airbnb, Booking.com, MakeMyTrip, Expedia, VRBO, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 className="font-medium">Setup Instructions</h3>

        <div className="space-y-4">
          {/* Gmail Instructions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                1
              </div>
              <h4 className="font-medium">Create Gmail Filters</h4>
            </div>
            <div className="ml-8 space-y-2 text-sm text-muted-foreground">
              <p>Set up automatic forwarding for each OTA platform:</p>
              <ol className="list-disc ml-4 space-y-1">
                <li>Open Gmail → Settings → Filters and Blocked Addresses</li>
                <li>Click "Create a new filter"</li>
                <li>
                  <strong>From:</strong> <code className="text-xs bg-muted px-1 py-0.5 rounded">noreply@airbnb.com</code>
                </li>
                <li>
                  <strong>Has the words:</strong> <code className="text-xs bg-muted px-1 py-0.5 rounded">reservation confirmed</code>
                </li>
                <li>Click "Create filter" → Check "Forward it to" → Select/add: <code className="text-xs bg-muted px-1 py-0.5 rounded">{inboundEmail}</code></li>
                <li>Click "Create filter"</li>
              </ol>
              <p className="text-xs italic mt-2">
                Repeat for other OTAs (booking.com, makemytrip.com, expedia.com, vrbo.com)
              </p>
            </div>
          </div>

          {/* What Gets Imported */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                2
              </div>
              <h4 className="font-medium">What Gets Imported</h4>
            </div>
            <div className="ml-8">
              <ul className="list-disc ml-4 space-y-1 text-sm text-muted-foreground">
                <li>Guest name, email, and phone number</li>
                <li>Check-in and check-out dates</li>
                <li>Number of guests</li>
                <li>OTA confirmation code</li>
                <li>Special requests and notes</li>
                <li>Room type and number (if specified)</li>
                <li>Total booking amount</li>
              </ul>
            </div>
          </div>

          {/* Supported Platforms */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                3
              </div>
              <h4 className="font-medium">Supported Platforms</h4>
            </div>
            <div className="ml-8">
              <div className="flex flex-wrap gap-2">
                {[
                  "Airbnb",
                  "Booking.com",
                  "MakeMyTrip",
                  "Expedia",
                  "VRBO",
                  "Agoda",
                  "Hotels.com",
                ].map((platform) => (
                  <span
                    key={platform}
                    className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 className="font-medium">How It Works</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="font-semibold text-foreground">1.</span>
            <p>
              You receive a booking confirmation email from an OTA (e.g., Airbnb, Booking.com)
            </p>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold text-foreground">2.</span>
            <p>Gmail automatically forwards it to your unique inbound email address</p>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold text-foreground">3.</span>
            <p>
              Our AI (OpenAI GPT-4) extracts all booking details from the email content
            </p>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold text-foreground">4.</span>
            <p>
              A new booking is automatically created in Staymod with status "confirmed"
            </p>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold text-foreground">5.</span>
            <p>
              The booking appears in your calendar and booking list - no manual entry needed!
            </p>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
        <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
          Important Notes
        </h4>
        <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
          <li>• Duplicate bookings are automatically detected and prevented</li>
          <li>• Only confirmation emails are processed (not inquiries or cancellations)</li>
          <li>• Bookings are marked as "confirmed" with advance payment recorded</li>
          <li>• Room assignment is done automatically based on availability</li>
          <li>• You can edit any imported booking details if needed</li>
        </ul>
      </div>
    </section>
  );
}
