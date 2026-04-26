import { apiFetch } from "@/utils/api-fetch";

export type PropertyListItem = {
  _id: string;
  name: string;
  slug: string;
  type: string;
  address: {
    city: string;
    state: string;
    country: string;
  };
  isActive: boolean;
};

export type PropertyDetails = {
  _id: string;
  name: string;
  slug: string;
  type: string;
  gstEnabled?: boolean;
  gstNumber?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
};

export type ListPropertiesResponse = {
  properties: PropertyListItem[];
};

export type CreatePropertyPayload = {
  name: string;
  type: "hotel" | "farmhouse" | "villa" | "homestay" | "resort" | "other";
  address: {
    line1: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
};

export type UpdatePropertySettingsPayload = {
  name: string;
  addressLine1: string;
  gstEnabled: boolean;
  gstNumber?: string;
};

export function fetchProperties() {
  return apiFetch<ListPropertiesResponse>("/api/properties");
}

export function fetchProperty(propertyId: string) {
  return apiFetch<{ property: PropertyDetails }>(`/api/properties/${propertyId}`);
}

export function createProperty(payload: CreatePropertyPayload) {
  return apiFetch<{ property: PropertyListItem }>("/api/properties", {
    method: "POST",
    json: payload,
  });
}

export function updatePropertySettings(propertyId: string, payload: UpdatePropertySettingsPayload) {
  return apiFetch<{ property: PropertyDetails }>(`/api/properties/${propertyId}`, {
    method: "PATCH",
    json: payload,
  });
}
