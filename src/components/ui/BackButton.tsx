"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { canGoBack } from "@/lib/navHistory";

interface BackButtonProps {
  fallbackHref?: string;
  className?: string;
  iconOnly?: boolean;
}

export default function BackButton({ fallbackHref = "/feed", className, iconOnly }: BackButtonProps) {
  const router = useRouter();

  function handleBack() {
    // No real in-app page to return to (shared link opened fresh, or we just
    // came from sign-in) — go to the fallback instead of bouncing through auth.
    if (canGoBack()) router.back();
    else router.push(fallbackHref);
  }

  if (iconOnly) {
    return (
      <button
        onClick={handleBack}
        aria-label="Back"
        className={className ?? "text-gray-400 hover:text-white transition-colors"}
      >
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <button
      onClick={handleBack}
      className={className ?? "flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"}
    >
      <ArrowLeft className="w-3.5 h-3.5" /> Back
    </button>
  );
}
