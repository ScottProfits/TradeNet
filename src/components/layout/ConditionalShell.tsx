"use client";
import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";

const AUTH_ROUTES = ["/sign-in", "/sign-up", "/"];

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname === "/" || AUTH_ROUTES.some((r) => r !== "/" && pathname.startsWith(r));

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-6 pb-6">{children}</main>
      <MobileNav />
    </>
  );
}
