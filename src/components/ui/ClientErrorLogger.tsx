"use client";
import { useEffect } from "react";

function report(message: string, stack?: string) {
  fetch("/api/log-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, stack, url: window.location.href }),
    keepalive: true,
  }).catch(() => {});
}

export default function ClientErrorLogger() {
  useEffect(() => {
    function onError(e: ErrorEvent) {
      report(e.message, e.error?.stack);
    }
    function onRejection(e: PromiseRejectionEvent) {
      const reason = e.reason;
      report(
        reason?.message ?? String(reason),
        reason?.stack
      );
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
