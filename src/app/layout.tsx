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
    <ClerkProvider publishableKey="pk_live_Y2xlcmsucnl6ci5hcHAk" appearance={{ variables: { colorPrimary: "#22c55e", colorDanger: "#ef4444" }, elements: { formButtonPrimary: "bg-green-500 hover:bg-green-400 text-black font-bold", footerActionLink: "text-green-400 font-semibold", userButtonPopoverCard: "!bg-[#1a1a1a] !border !border-white/10 !shadow-2xl", userButtonPopoverActionButton: "!text-gray-300 hover:!bg-white/5 hover:!text-white", userButtonPopoverActionButtonText: "!text-gray-300", userButtonPopoverActionButtonIcon: "!text-gray-500", userButtonPopoverFooter: "!bg-[#111111] !border-t !border-white/10", userPreviewMainIdentifier: "!text-white !font-semibold", userPreviewSecondaryIdentifier: "!text-gray-400" } }}>
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
