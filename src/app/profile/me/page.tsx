"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { demoProfileData } from "@/lib/demoData";

export default function MyProfileRedirect() {
  return (
    <Suspense fallback={null}>
      <MyProfileRedirectInner />
    </Suspense>
  );
}

function MyProfileRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isDemo) { router.replace(`/profile/${demoProfileData.profile.handle}?demo=1`); return; }
    if (!isLoaded) return;
    if (!isSignedIn) { router.replace("/sign-in"); return; }
    fetch("/api/profile/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.handle) router.replace(`/profile/${d.handle}`);
        else router.replace("/settings");
      });
  }, [isLoaded, isSignedIn, router, isDemo]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
