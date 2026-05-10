# Inbound Booking Sync Setup Guide

Complete setup guide for automatic OTA booking import via email forwarding and AI parsing.

## Overview

The inbound sync system allows automatic creation of bookings when you receive confirmation emails from OTA platforms (Airbnb, Booking.com, MakeMyTrip, etc.). Uses OpenAI GPT-4 to parse emails intelligently.

---

## Prerequisites

1. ✅ **OpenAI API Key** - You have `OPEN_AI_API_KEY` in `.env.local`
2. ✅ **Resend Account** - You have `RESEND_API_KEY` in `.env.local`
3. 🔲 **Domain Access** - Access to DNS records for `staymod.in`

---

## Setup Steps

### Step 1: Configure Resend Inbound for Main Domain

1. **Add Main Domain in Resend Dashboard (if not already added):**
   - Go to https://resend.com/domains
   - Your main domain `staymod.in` should already be verified for sending emails
   - We'll use the same domain for inbound emails

2. **Verify MX Records:**
   
   Ensure your domain has MX records pointing to Resend:

   ```
   Type: MX
   Host: staymod.in (or @)
   Priority: 10
   Value: inbound-smtp.resend.com
   TTL: 3600
   ```

   **Note:** If you use this domain for regular emails (Google Workspace, etc.), you may need to add multiple MX records with priorities. Resend inbound can coexist with other email services.

3. **Wait for Verification:**
   - DNS propagation takes 5-15 minutes
   - Resend will verify automatically
   - Domain status will show "Verified" when ready

### Step 2: Create Inbound Route in Resend

**Option A: Via Resend Dashboard (Recommended)**

1. Go to https://resend.com/inbound
2. Click "Create Route"
3. Configure:
   - **Domain:** `staymod.in`
   - **Match Pattern:** `property-inbound-*@staymod.in`
   - **Forward To:** `https://staymod.in/api/webhooks/inbound-booking`
4. Click "Create"

**Option B: Via Resend API**

```bash
curl -X POST https://api.resend.com/emails/inbound \
  -H "Authorization: Bearer YOUR_RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "staymod.in",
    "pattern": "property-inbound-*@staymod.in",
    "forward_to": "https://staymod.in/api/webhooks/inbound-booking"
  }'
```

### Step 3: Test the Webhook

Send a test email to verify the setup:

```bash
# 1. Send test email to a property-inbound address
# Example: property-inbound-test@staymod.in
# Or use a real propertyId: property-inbound-663f4a1b2c3d4e5f6a7b8c9d@staymod.in

# 2. Check webhook logs
# The webhook should receive the email and log it

# 3. Check your server logs for:
# "📧 Inbound email received: ..."
```

### Step 4: Add UI to Property Settings

Add the inbound sync section to your property settings page:

```typescript
// In your property settings page
import { PropertyInboundSyncSection } from "@/components/global/property-inbound-sync-section";
import { InboundSyncStats } from "@/components/global/inbound-sync-stats";

// In your component:
<PropertyInboundSyncSection propertyId={propertyId} />
<InboundSyncStats propertyId={propertyId} />
```

---

## How Clients Use It

### For Each Property:

1. **Get Unique Email:**
   - Property ID: `abc123def456`
   - Inbound Email: `property-inbound-abc123def456@staymod.in`

2. **Set Up Gmail Forwarding:**

   For each OTA (Airbnb, Booking.com, etc.):
   
   - Open Gmail → Settings → Filters
   - Create Filter:
     - **From:** `noreply@airbnb.com`
     - **Subject:** `reservation` or `booking confirmed`
   - **Action:** Forward to `property-inbound-abc123def456@staymod.in`
   - Save filter

3. **Done!** All future booking confirmations auto-import

---

## Testing with Real OTA Emails

### Airbnb Test:

1. Forward an Airbnb confirmation to your test property email
2. Check server logs for GPT-4 parsing output
3. Verify booking created in Staymod

### Booking.com Test:

1. Forward a Booking.com confirmation
2. Check extraction accuracy
3. Verify room matching

### Troubleshooting:

If a booking doesn't get created:

1. **Check webhook logs** - Did email arrive?
2. **Check `unprocessedEmails` collection** - Was it rejected?
3. **Check `failedBookingImports` collection** - Did parsing work but creation fail?
4. **Check GPT-4 response** - What did the LLM extract?

---

## Cost Estimates

### OpenAI API Costs:

- **Model:** GPT-4o (2024-08-06)
- **Pricing:** ~$2.50 per 1M input tokens, ~$10 per 1M output tokens
- **Per Email:** 
  - Input: ~1500 tokens (~$0.004)
  - Output: ~300 tokens (~$0.003)
  - **Total: ~$0.007 per email** (less than 1 cent)

### Monthly Estimates:

| Bookings/Month | OpenAI Cost | Resend Cost (free tier) |
|----------------|-------------|-------------------------|
| 100            | $0.70       | Free                   |
| 500            | $3.50       | Free                   |
| 1,000          | $7.00       | Free                   |
| 5,000          | $35.00      | Free (up to 100/day)   |

**Resend Inbound:** Free for up to 100 emails/day

---

## Database Collections

The system creates these collections:

### 1. `bookings`
- Imported bookings have `externalReference.importedFrom: "email"`
- Contains raw email metadata in `externalReference.rawEmail`

### 2. `unprocessedEmails`
- Emails that weren't booking confirmations
- Stored for potential review/debugging

### 3. `failedBookingImports`
- Emails that parsed successfully but booking creation failed
- Usually due to missing rooms or validation errors

---

## Monitoring

### Check Import Success Rate:

```javascript
// In MongoDB
db.bookings.countDocuments({ "externalReference.importedFrom": "email" })
db.unprocessedEmails.countDocuments()
db.failedBookingImports.countDocuments()
```

### Common Issues:

1. **No rooms in property** → Booking creation fails
2. **Duplicate emails** → Correctly prevented by duplicate detection
3. **Not a confirmation** → Stored in `unprocessedEmails`
4. **Parsing error** → Check OpenAI API logs

---

## Security Considerations

1. **No Authentication on Webhook:** Resend forwards directly
2. **Validation:** PropertyId must exist in database
3. **Duplicate Prevention:** Checks confirmation code + dates
4. **Email Storage:** Raw emails stored for audit trail
5. **Rate Limiting:** Consider adding if needed

---

## Future Enhancements

- [ ] Manual review UI for failed imports
- [ ] Feedback loop for improving extraction
- [ ] Support for booking modifications/cancellations
- [ ] OCR for PDF attachments
- [ ] Multi-language support
- [ ] Custom parsing rules per property
- [ ] Notification on successful import

---

## Support

If you encounter issues:

1. Check server logs (`/api/webhooks/inbound-booking`)
2. Check OpenAI API dashboard for errors
3. Check Resend dashboard for delivery status
4. Review MongoDB collections for clues
5. Test with the JSON mode fallback if structured outputs fail

---

## Environment Variables

Required in `.env.local`:

```bash
# OpenAI
OPEN_AI_API_KEY=sk-proj-...

# Resend
RESEND_API_KEY=re_...

# MongoDB (already configured)
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=staymod
```
