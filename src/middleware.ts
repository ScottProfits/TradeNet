import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/", "/privacy", "/terms", "/support", "/trade/(.*)", "/api/trades/(.*)", "/api/log-error", "/api/webhooks/(.*)", "/rooms(.*)", "/api/rooms/(.*)/preview", "/indicator", "/products/(.*)", "/api/products/(.*)"]);

// Sign-in/up URLs are set here, not only via env vars: without them Clerk
// redirects signed-out visitors to its hosted portal (accounts.ryzr.app), which
// the iOS app can't show in-app and hands off to Safari (App Store rejection).
export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" }
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
