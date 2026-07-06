"use client";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import MobileTopMenu from "@/components/layout/MobileTopMenu";

const AUTH_ROUTES = ["/sign-in", "/sign-up", "/"];

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname === "/" || AUTH_ROUTES.some((r) => r !== "/" && pathname.startsWith(r));
  const isProfileRoute = pathname.startsWith("/profile/");

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <>
      {!isProfileRoute && <Navbar />}
      {!isProfileRoute && <MobileTopMenu />}
      <main className={clsx("max-w-7xl mx-auto px-4 pb-6", isProfileRoute ? "pt-8" : "pt-3 lg:pt-6")}>{children}</main>
      {!isProfileRoute && <MobileNav />}
    </>
  );
}
