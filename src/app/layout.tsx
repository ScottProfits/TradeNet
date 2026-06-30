import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
import ConditionalShell from "@/components/layout/ConditionalShell";
import PushNotificationSetup from "@/components/ui/PushNotificationSetup";

export const metadata: Metadata = {
  title: "Ryzr — Social Trading Network",
  description: "Follow top traders, verify real P&L, copy winning strategies.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ryzr",
    startupImage: "/apple-touch-icon.png",
  },
  icons: {
    apple: "/apple-touch-icon-v3.png",
  },
  themeColor: "#00C896",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ theme: dark, variables: { colorPrimary: "#22c55e", colorDanger: "#ef4444" } }} afterSignUpUrl="/onboarding">
      <html lang="en">
        <head>
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-v3.png" />
        </head>
        <body>
          <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }` }} />
          <PushNotificationSetup />
          <ConditionalShell>{children}</ConditionalShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
