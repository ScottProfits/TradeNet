"use client";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Capacitor } from "@capacitor/core";

export default function NativePushSetup() {
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    if (!Capacitor.isNativePlatform()) return;

    let registrationListener: { remove: () => void } | undefined;
    let errorListener: { remove: () => void } | undefined;

    (async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      const perm = await PushNotifications.checkPermissions();
      let status = perm.receive;
      if (status !== "granted") {
        const req = await PushNotifications.requestPermissions();
        status = req.receive;
      }
      if (status !== "granted") return;

      registrationListener = await PushNotifications.addListener("registration", async (token) => {
        await fetch("/api/push/register-native", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: token.value, platform: Capacitor.getPlatform() }),
        }).catch(() => {});
      });

      errorListener = await PushNotifications.addListener("registrationError", () => {});

      await PushNotifications.register();
    })().catch(() => {});

    return () => {
      registrationListener?.remove();
      errorListener?.remove();
    };
  }, [isSignedIn]);

  return null;
}
