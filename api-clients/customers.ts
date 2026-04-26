import { apiFetch } from "@/utils/api-fetch";

export type CustomerListItem = {
  _id: string;
  propertyId: string;
  orgId: string;
  email: string;
  name?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastBookingAt?: string;
  identityDocuments?: Array<{
    bookingId: string;
    fileUrl: string;
    fileKey: string;
    fileName: string;
    contentType: string;
    source: "camera" | "photo" | "pdf";
    uploadedAt: string;
  }>;
};

export type ListCustomersResponse = {
  customers: CustomerListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type UpsertCustomerPayload = {
  email: string;
  name?: string;
  phone?: string;
  identityDocuments?: Array<{
    bookingId: string;
    fileUrl: string;
    fileKey: string;
    fileName: string;
    contentType: string;
    source: "camera" | "photo" | "pdf";
    uploadedAt: string;
  }>;
};

export function fetchCustomers(
  propertyId: string,
  params?: {
    page?: number;
    limit?: number;
    q?: string;
  },
) {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  if (params?.q?.trim()) search.set("q", params.q.trim());
  const query = search.toString();
  return apiFetch<ListCustomersResponse>(
    `/api/properties/${propertyId}/customers${query ? `?${query}` : ""}`,
  );
}

export function createCustomer(propertyId: string, payload: UpsertCustomerPayload) {
  return apiFetch<{ customer: CustomerListItem }>(`/api/properties/${propertyId}/customers`, {
    method: "POST",
    json: payload,
  });
}

export function updateCustomer(propertyId: string, customerId: string, payload: UpsertCustomerPayload) {
  return apiFetch<{ customer: CustomerListItem }>(
    `/api/properties/${propertyId}/customers/${customerId}`,
    {
      method: "PATCH",
      json: payload,
    },
  );
}

export function deleteCustomer(propertyId: string, customerId: string) {
  return apiFetch<{ deleted: boolean }>(`/api/properties/${propertyId}/customers/${customerId}`, {
    method: "DELETE",
  });
}
