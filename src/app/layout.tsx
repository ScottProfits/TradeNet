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
  },
  themeColor: "#00C896",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ theme: dark, variables: { colorPrimary: "#22c55e", colorDanger: "#ef4444" } }}>
      <html lang="en">
        <body>
          <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }` }} />
          <PushNotificationSetup />
          <ConditionalShell>{children}</ConditionalShell>
        </body>
      </html>
    </ClerkProvider>
  );
}
