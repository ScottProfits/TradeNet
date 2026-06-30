"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function MyProfileRedirect() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.replace("/sign-in"); return; }
    fetch("/api/profile/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.handle) router.replace(`/profile/${d.handle}`);
        else router.replace("/settings");
      });
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
