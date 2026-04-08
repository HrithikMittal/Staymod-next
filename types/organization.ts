/**
 * Clerk is the source of truth for organizations (dashboard, roles, invitations).
 * Use `orgId` from `auth()` / `OrganizationSwitcher` when scoping server data and MongoDB queries.
 */
export type OrganizationScope = {
  orgId: string;
};
