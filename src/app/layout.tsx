import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "@/components/layout/Navbar";

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
    <ClerkProvider publishableKey="pk_live_Y2xlcmsucnl6ci5hcHAk" appearance={{ elements: { headerTitle: "!text-white font-bold text-2xl", headerSubtitle: "!text-gray-300 font-medium", formFieldLabel: "!text-gray-200 font-semibold", dividerText: "!text-gray-300 font-semibold", footerActionText: "!text-gray-300 font-medium", footerActionLink: "!text-[#00C896] font-semibold" } }}>
      <html lang="en">
        <body>
          <script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }` }} />
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 pt-6 pb-16">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
