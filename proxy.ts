import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

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
