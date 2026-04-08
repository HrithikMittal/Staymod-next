import { apiFetch } from "@/utils/api-fetch";

export type HealthResponse = {
  ok: boolean;
  database: "up" | "down" | "not_configured";
};

export function fetchHealth() {
  return apiFetch<HealthResponse>("/api/health");
}
