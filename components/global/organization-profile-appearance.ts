/**
 * Styling for embedded {@link OrganizationProfile} (team page).
 * Removes the default “floating card” box-shadow on the profile shell.
 */
export const organizationTeamProfileAppearance = {
  variables: {
    /** Drives Clerk’s layered shadows; transparent removes visible shadow tint. */
    colorShadow: "transparent",
  },
  elements: {
    rootBox: "shadow-none",
    card: "shadow-none",
    cardBox: "shadow-none",
    scrollBox: "shadow-none",
    navbar: "shadow-none",
    navbarMobileMenuRow: "shadow-none",
    pageScrollBox: "shadow-none",
    profilePage: "shadow-none",
  },
} as const;
