import { apiFetch } from "@/utils/api-fetch";

export type PropertyEmailSettingsPublic = {
  configured: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  fromEmail: string;
  ccEmail: string;
  notifyOnConfirmation: boolean;
  notifyOnUpdate: boolean;
  notifyOnCancellation: boolean;
  updatedAt: string | null;
};

export type GetEmailSettingsResponse = {
  emailSettings: PropertyEmailSettingsPublic;
};

export type PatchEmailSettingsPayload = {
  resendApiKey?: string | null;
  fromEmail?: string;
  ccEmail?: string;
  notifyOnConfirmation?: boolean;
  notifyOnUpdate?: boolean;
  notifyOnCancellation?: boolean;
};

export function fetchEmailSettings(propertyId: string) {
  return apiFetch<GetEmailSettingsResponse>(`/api/properties/${propertyId}/email-settings`);
}

export function patchEmailSettings(propertyId: string, payload: PatchEmailSettingsPayload) {
  return apiFetch<GetEmailSettingsResponse>(`/api/properties/${propertyId}/email-settings`, {
    method: "PATCH",
    json: payload,
  });
}
