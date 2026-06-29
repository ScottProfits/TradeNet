import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
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
    <ClerkProvider publishableKey="pk_live_Y2xlcmsucnl6ci5hcHAk" appearance={{ variables: { colorPrimary: "#22c55e", colorBackground: "#111111", colorInputBackground: "#0f0f0f", colorInputText: "#ffffff", colorText: "#ffffff", colorTextSecondary: "#9ca3af", colorDanger: "#ef4444", borderRadius: "0.75rem" }, elements: { card: "shadow-2xl border border-white/10", headerTitle: "text-white font-bold", headerSubtitle: "text-gray-400", formFieldLabel: "text-gray-400 text-xs uppercase tracking-wide", formFieldInput: "bg-[#0f0f0f] border-white/10 text-white", formButtonPrimary: "bg-green-500 hover:bg-green-400 text-black font-bold", footerActionLink: "text-green-400 font-semibold", footerActionText: "text-gray-500", dividerText: "text-gray-600", socialButtonsBlockButton: "border-white/10 text-white", socialButtonsBlockButtonText: "text-white" } }}>
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
