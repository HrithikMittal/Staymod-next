import { apiFetch } from "@/utils/api-fetch";

export type ApiKeyItem = {
  _id: string;
  name?: string;
  keyPrefix: string;
  orgId: string;
  propertyIds: string[];
  scopes: string[];
  allowedOrigins: string[];
  allowedIps: string[];
  isActive: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ListApiKeysResponse = {
  apiKeys: ApiKeyItem[];
};

export type CreateApiKeyPayload = {
  name?: string;
  scopes?: string[];
  allowedOrigins?: string[] | string;
  allowedIps?: string[] | string;
};

export type CreateApiKeyResponse = {
  apiKey: ApiKeyItem;
  rawKey: string;
};

export function fetchApiKeys(propertyId: string) {
  return apiFetch<ListApiKeysResponse>(`/api/properties/${propertyId}/integrations/api-keys`);
}

export function createApiKey(propertyId: string, payload: CreateApiKeyPayload) {
  return apiFetch<CreateApiKeyResponse>(`/api/properties/${propertyId}/integrations/api-keys`, {
    method: "POST",
    json: payload,
  });
}

export function updateApiKey(
  propertyId: string,
  keyId: string,
  payload: Partial<{
    name: string;
    scopes: string[];
    allowedOrigins: string[] | string;
    allowedIps: string[] | string;
    isActive: boolean;
  }>,
) {
  return apiFetch<{ apiKey: ApiKeyItem }>(`/api/properties/${propertyId}/integrations/api-keys/${keyId}`, {
    method: "PATCH",
    json: payload,
  });
}

export function deleteApiKey(propertyId: string, keyId: string) {
  return apiFetch<{ deleted: boolean }>(`/api/properties/${propertyId}/integrations/api-keys/${keyId}`, {
    method: "DELETE",
  });
}
