import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** `/` only — not `/integration-guide`, `/sign-in`, etc. */
const isPrivateHomeRoute = createRouteMatcher([/^\/$/]);

/** `/:id` property roots should be private, excluding known public top-level routes. */
const isPrivatePropertyRootRoute = createRouteMatcher([
  /^\/(?!sign-in$|sign-up$|integration-guide$|session-tasks$)[^/]+$/,
]);

/** Signed-in users without an org may visit these paths without being redirected to the org task page. */
const isPublicWhenMissingOrg = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/integration-guide(.*)",
  "/session-tasks/choose-organization(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const isProtectedRoute = isPrivateHomeRoute(req) || isPrivatePropertyRootRoute(req);
  const { isAuthenticated, sessionStatus, userId, orgId, redirectToSignIn } = await auth();

  if (isProtectedRoute && !isAuthenticated) {
    // Docs pattern: pending sessions should be redirected to task UI, not sign-in.
    if (sessionStatus === "pending") {
      const url = req.nextUrl.clone();
      url.pathname = "/session-tasks/choose-organization";
      return NextResponse.redirect(url);
    }
    return redirectToSignIn();
  }


  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (!userId || orgId) {
    return NextResponse.next();
  }

  if (isPublicWhenMissingOrg(req)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/session-tasks/choose-organization";
  return NextResponse.redirect(url);
});

/**
 * Must stay inline: Next.js requires a statically analyzable `matcher` array here
 * (see `AGENTS.md`). Do not move this to a shared constant import.
 *
 * Next.js 16 uses `proxy.ts` as the Clerk / edge entry (the older `middleware.ts` name is deprecated).
 */
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
