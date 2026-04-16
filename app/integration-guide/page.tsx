import type { Metadata } from "next";
import { headers } from "next/headers";

import { IntegrationGuidePage } from "@/components/global/integration-guide/integration-guide-page";
import { publicApiV1BaseUrlFromHeaders } from "@/utils/public-api-base-url-server";

export const metadata: Metadata = {
  title: "Integration guide",
  description: "Staymod public API: authentication, scopes, and example requests.",
};

export default async function IntegrationGuideRoute() {
  const h = await headers();
  const publicApiBaseUrl = publicApiV1BaseUrlFromHeaders(h);
  return <IntegrationGuidePage publicApiBaseUrl={publicApiBaseUrl} />;
}
