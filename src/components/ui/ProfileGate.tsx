"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const ALLOWED_WHILE_INCOMPLETE = ["/settings", "/sign-in", "/sign-up"];

export default function ProfileGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (ALLOWED_WHILE_INCOMPLETE.some((p) => pathname.startsWith(p))) return;

    fetch("/api/profile/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.handle?.startsWith("user_")) {
          router.replace("/settings");
        }
      });
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}
